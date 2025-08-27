ALTER TABLE public.bucket_transactions
ALTER COLUMN description SET NOT NULL;

ALTER TABLE public.bucket_transactions
DROP CONSTRAINT IF EXISTS check_transaction_description_length;

ALTER TABLE public.bucket_transactions
ADD CONSTRAINT check_transaction_description_length 
CHECK (char_length(description) <= 500);
