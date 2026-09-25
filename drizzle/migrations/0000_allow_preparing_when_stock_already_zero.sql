CREATE OR REPLACE FUNCTION public.handle_order_status_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_item RECORD;
  v_has_insufficient_stock BOOLEAN;
BEGIN
  IF NEW.status = 'preparando'::order_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND COALESCE(OLD.stock_deducted, false) = false THEN

    SELECT EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
        AND p.stock < oi.quantity
    ) INTO v_has_insufficient_stock;

    IF NOT v_has_insufficient_stock THEN
      FOR v_item IN
        SELECT product_id, quantity
        FROM public.order_items
        WHERE order_id = NEW.id
      LOOP
        UPDATE public.products
           SET stock = stock - v_item.quantity
         WHERE id = v_item.product_id;
      END LOOP;

      NEW.stock_deducted := true;
    ELSE
      NEW.stock_deducted := false;
    END IF;
  END IF;

  IF NEW.status = 'cancelado'::order_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND COALESCE(OLD.stock_deducted, false) = true THEN

    FOR v_item IN
      SELECT product_id, quantity
      FROM public.order_items
      WHERE order_id = NEW.id
    LOOP
      UPDATE public.products
         SET stock = stock + v_item.quantity
       WHERE id = v_item.product_id;
    END LOOP;

    NEW.stock_deducted := false;
  END IF;

  RETURN NEW;
END;
$function$;