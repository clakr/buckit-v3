create type "public"."transaction_type" as enum ('inbound', 'outbound');

create table "public"."bucket_transaction" (
    "id" uuid not null default gen_random_uuid(),
    "bucket_id" uuid not null,
    "user_id" uuid not null default auth.uid(),
    "type" transaction_type not null,
    "amount" numeric(12,2) not null,
    "balance_after" numeric(12,2),
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."bucket_transaction" enable row level security;

create table "public"."buckets" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "name" text not null,
    "current_amount" numeric(12,2) not null default 0.00,
    "description" text,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."buckets" enable row level security;

CREATE UNIQUE INDEX bucket_transaction_pkey ON public.bucket_transaction USING btree (id);

CREATE UNIQUE INDEX buckets_pkey ON public.buckets USING btree (id);

CREATE INDEX idx_bucket_transaction_bucket_id ON public.bucket_transaction USING btree (bucket_id);

CREATE INDEX idx_bucket_transaction_created_at ON public.bucket_transaction USING btree (created_at DESC);

CREATE INDEX idx_bucket_transaction_type ON public.bucket_transaction USING btree (type);

CREATE INDEX idx_bucket_transaction_user_id ON public.bucket_transaction USING btree (user_id);

CREATE INDEX idx_buckets_created_at ON public.buckets USING btree (created_at DESC);

CREATE INDEX idx_buckets_is_active ON public.buckets USING btree (is_active);

CREATE INDEX idx_buckets_user_id ON public.buckets USING btree (user_id);

alter table "public"."bucket_transaction" add constraint "bucket_transaction_pkey" PRIMARY KEY using index "bucket_transaction_pkey";

alter table "public"."buckets" add constraint "buckets_pkey" PRIMARY KEY using index "buckets_pkey";

alter table "public"."bucket_transaction" add constraint "bucket_transaction_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES buckets(id) ON DELETE CASCADE not valid;

alter table "public"."bucket_transaction" validate constraint "bucket_transaction_bucket_id_fkey";

alter table "public"."bucket_transaction" add constraint "bucket_transaction_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."bucket_transaction" validate constraint "bucket_transaction_user_id_fkey";

alter table "public"."bucket_transaction" add constraint "check_transaction_amount" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."bucket_transaction" validate constraint "check_transaction_amount";

alter table "public"."bucket_transaction" add constraint "check_transaction_description_length" CHECK (((description IS NULL) OR (char_length(description) <= 500))) not valid;

alter table "public"."bucket_transaction" validate constraint "check_transaction_description_length";

alter table "public"."buckets" add constraint "buckets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."buckets" validate constraint "buckets_user_id_fkey";

alter table "public"."buckets" add constraint "check_bucket_description_length" CHECK (((description IS NULL) OR (char_length(description) <= 500))) not valid;

alter table "public"."buckets" validate constraint "check_bucket_description_length";

alter table "public"."buckets" add constraint "check_bucket_name_length" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))) not valid;

alter table "public"."buckets" validate constraint "check_bucket_name_length";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_bucket_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_balance numeric(12, 2);
  v_new_balance numeric(12, 2);
BEGIN
  -- Get the current balance of the bucket
  SELECT current_amount INTO v_current_balance
  FROM buckets
  WHERE id = NEW.bucket_id
  FOR UPDATE; -- Lock the row to prevent concurrent updates

  -- Calculate new balance based on transaction type
  IF NEW.type = 'inbound' THEN
    v_new_balance := v_current_balance + NEW.amount;
  ELSIF NEW.type = 'outbound' THEN
    v_new_balance := v_current_balance - NEW.amount;
    -- Ensure balance doesn't go negative
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient balance. Current balance: %, Transaction amount: %',
        v_current_balance, NEW.amount;
    END IF;
  END IF;

  -- Set the balance_after for this transaction
  NEW.balance_after := v_new_balance;

  -- Update the bucket's current_amount
  UPDATE buckets
  SET current_amount = v_new_balance
  WHERE id = NEW.bucket_id;

  RETURN NEW;
END;
$function$
;

grant delete on table "public"."bucket_transaction" to "anon";

grant insert on table "public"."bucket_transaction" to "anon";

grant references on table "public"."bucket_transaction" to "anon";

grant select on table "public"."bucket_transaction" to "anon";

grant trigger on table "public"."bucket_transaction" to "anon";

grant truncate on table "public"."bucket_transaction" to "anon";

grant update on table "public"."bucket_transaction" to "anon";

grant delete on table "public"."bucket_transaction" to "authenticated";

grant insert on table "public"."bucket_transaction" to "authenticated";

grant references on table "public"."bucket_transaction" to "authenticated";

grant select on table "public"."bucket_transaction" to "authenticated";

grant trigger on table "public"."bucket_transaction" to "authenticated";

grant truncate on table "public"."bucket_transaction" to "authenticated";

grant update on table "public"."bucket_transaction" to "authenticated";

grant delete on table "public"."bucket_transaction" to "service_role";

grant insert on table "public"."bucket_transaction" to "service_role";

grant references on table "public"."bucket_transaction" to "service_role";

grant select on table "public"."bucket_transaction" to "service_role";

grant trigger on table "public"."bucket_transaction" to "service_role";

grant truncate on table "public"."bucket_transaction" to "service_role";

grant update on table "public"."bucket_transaction" to "service_role";

grant delete on table "public"."buckets" to "anon";

grant insert on table "public"."buckets" to "anon";

grant references on table "public"."buckets" to "anon";

grant select on table "public"."buckets" to "anon";

grant trigger on table "public"."buckets" to "anon";

grant truncate on table "public"."buckets" to "anon";

grant update on table "public"."buckets" to "anon";

grant delete on table "public"."buckets" to "authenticated";

grant insert on table "public"."buckets" to "authenticated";

grant references on table "public"."buckets" to "authenticated";

grant select on table "public"."buckets" to "authenticated";

grant trigger on table "public"."buckets" to "authenticated";

grant truncate on table "public"."buckets" to "authenticated";

grant update on table "public"."buckets" to "authenticated";

grant delete on table "public"."buckets" to "service_role";

grant insert on table "public"."buckets" to "service_role";

grant references on table "public"."buckets" to "service_role";

grant select on table "public"."buckets" to "service_role";

grant trigger on table "public"."buckets" to "service_role";

grant truncate on table "public"."buckets" to "service_role";

grant update on table "public"."buckets" to "service_role";

create policy "Users can insert transactions for their own buckets"
on "public"."bucket_transaction"
as permissive
for insert
to public
with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM buckets
  WHERE ((buckets.id = bucket_transaction.bucket_id) AND (buckets.user_id = auth.uid()))))));


create policy "Users can view their own transactions"
on "public"."bucket_transaction"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can create own buckets"
on "public"."buckets"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete own buckets"
on "public"."buckets"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update own buckets"
on "public"."buckets"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view own buckets"
on "public"."buckets"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER process_transaction_before_insert BEFORE INSERT ON public.bucket_transaction FOR EACH ROW EXECUTE FUNCTION process_bucket_transaction();

CREATE TRIGGER update_bucket_transaction_updated_at BEFORE UPDATE ON public.bucket_transaction FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_buckets_updated_at BEFORE UPDATE ON public.buckets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();