
-- 1) place_order: validate stock but DO NOT decrement
CREATE OR REPLACE FUNCTION public.place_order(_customer_name text, _customer_phone text, _mode order_mode, _address text, _delivery_fee numeric, _items jsonb, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id UUID;
  v_subtotal NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2);
  v_item JSONB;
  v_product RECORD;
  v_qty INTEGER;
BEGIN
  IF _customer_name IS NULL OR length(trim(_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;
  IF jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;

  -- Validate stock availability without decrementing
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    SELECT id, name, price, stock INTO v_product
      FROM public.products
      WHERE id = (v_item->>'product_id')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto % não encontrado', v_item->>'product_id';
    END IF;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Estoque insuficiente para %', v_product.name;
    END IF;
    v_subtotal := v_subtotal + (v_product.price * v_qty);
  END LOOP;

  v_total := v_subtotal + COALESCE(_delivery_fee, 0);

  INSERT INTO public.orders (customer_name, customer_phone, mode, address, subtotal, delivery_fee, total, notes)
  VALUES (_customer_name, COALESCE(_customer_phone, ''), _mode, _address, v_subtotal, COALESCE(_delivery_fee,0), v_total, _notes)
  RETURNING id INTO v_order_id;

  -- Insert items WITHOUT decrementing stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    SELECT id, name, price INTO v_product
      FROM public.products WHERE id = (v_item->>'product_id')::UUID;

    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.price, v_qty);
  END LOOP;

  RETURN v_order_id;
END;
$function$;

-- Track whether stock has been deducted for an order
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted boolean NOT NULL DEFAULT false;

-- 2) Trigger: decrement stock when status moves to 'preparando' (and restore on cancel)
CREATE OR REPLACE FUNCTION public.handle_order_status_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Decrement stock when status becomes 'preparando' and not yet deducted
  IF NEW.status = 'preparando'::order_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND COALESCE(OLD.stock_deducted, false) = false THEN

    FOR v_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id
    LOOP
      UPDATE public.products
         SET stock = stock - v_item.quantity
       WHERE id = v_item.product_id;

      IF (SELECT stock FROM public.products WHERE id = v_item.product_id) < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para confirmar pedido';
      END IF;
    END LOOP;

    NEW.stock_deducted := true;
  END IF;

  -- Restore stock if a previously deducted order is cancelled
  IF NEW.status = 'cancelado'::order_status
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND COALESCE(OLD.stock_deducted, false) = true THEN

    FOR v_item IN
      SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id
    LOOP
      UPDATE public.products
         SET stock = stock + v_item.quantity
       WHERE id = v_item.product_id;
    END LOOP;

    NEW.stock_deducted := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_stock_on_status ON public.orders;
CREATE TRIGGER trg_orders_stock_on_status
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_status_stock();
