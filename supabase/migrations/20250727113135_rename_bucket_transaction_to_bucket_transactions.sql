drop trigger if exists "process_transaction_before_insert" on "public"."bucket_transaction";

drop trigger if exists "update_bucket_transaction_updated_at" on "public"."bucket_transaction";

drop policy "Users can insert transactions for their own buckets" on "public"."bucket_transaction";

drop policy "Users can view their own transactions" on "public"."bucket_transaction";

revoke delete on table "public"."bucket_transaction" from "anon";

revoke insert on table "public"."bucket_transaction" from "anon";

revoke references on table "public"."bucket_transaction" from "anon";

revoke select on table "public"."bucket_transaction" from "anon";

revoke trigger on table "public"."bucket_transaction" from "anon";

revoke truncate on table "public"."bucket_transaction" from "anon";

revoke update on table "public"."bucket_transaction" from "anon";

revoke delete on table "public"."bucket_transaction" from "authenticated";

revoke insert on table "public"."bucket_transaction" from "authenticated";

revoke references on table "public"."bucket_transaction" from "authenticated";

revoke select on table "public"."bucket_transaction" from "authenticated";

revoke trigger on table "public"."bucket_transaction" from "authenticated";

revoke truncate on table "public"."bucket_transaction" from "authenticated";

revoke update on table "public"."bucket_transaction" from "authenticated";

revoke delete on table "public"."bucket_transaction" from "service_role";

revoke insert on table "public"."bucket_transaction" from "service_role";

revoke references on table "public"."bucket_transaction" from "service_role";

revoke select on table "public"."bucket_transaction" from "service_role";

revoke trigger on table "public"."bucket_transaction" from "service_role";

revoke truncate on table "public"."bucket_transaction" from "service_role";

revoke update on table "public"."bucket_transaction" from "service_role";

alter table "public"."bucket_transaction" drop constraint "bucket_transaction_bucket_id_fkey";

alter table "public"."bucket_transaction" drop constraint "bucket_transaction_user_id_fkey";

alter table "public"."bucket_transaction" drop constraint "check_transaction_amount";

alter table "public"."bucket_transaction" drop constraint "check_transaction_description_length";

alter table "public"."bucket_transaction" drop constraint "bucket_transaction_pkey";

drop index if exists "public"."bucket_transaction_pkey";

drop index if exists "public"."idx_bucket_transaction_bucket_id";

drop index if exists "public"."idx_bucket_transaction_created_at";

drop index if exists "public"."idx_bucket_transaction_type";

drop index if exists "public"."idx_bucket_transaction_user_id";

drop table "public"."bucket_transaction";

create table "public"."bucket_transactions" (
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


alter table "public"."bucket_transactions" enable row level security;

CREATE UNIQUE INDEX bucket_transaction_pkey ON public.bucket_transactions USING btree (id);

CREATE INDEX idx_bucket_transaction_bucket_id ON public.bucket_transactions USING btree (bucket_id);

CREATE INDEX idx_bucket_transaction_created_at ON public.bucket_transactions USING btree (created_at DESC);

CREATE INDEX idx_bucket_transaction_type ON public.bucket_transactions USING btree (type);

CREATE INDEX idx_bucket_transaction_user_id ON public.bucket_transactions USING btree (user_id);

alter table "public"."bucket_transactions" add constraint "bucket_transaction_pkey" PRIMARY KEY using index "bucket_transaction_pkey";

alter table "public"."bucket_transactions" add constraint "bucket_transaction_bucket_id_fkey" FOREIGN KEY (bucket_id) REFERENCES buckets(id) ON DELETE CASCADE not valid;

alter table "public"."bucket_transactions" validate constraint "bucket_transaction_bucket_id_fkey";

alter table "public"."bucket_transactions" add constraint "bucket_transaction_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."bucket_transactions" validate constraint "bucket_transaction_user_id_fkey";

alter table "public"."bucket_transactions" add constraint "check_transaction_amount" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."bucket_transactions" validate constraint "check_transaction_amount";

alter table "public"."bucket_transactions" add constraint "check_transaction_description_length" CHECK (((description IS NULL) OR (char_length(description) <= 500))) not valid;

alter table "public"."bucket_transactions" validate constraint "check_transaction_description_length";

grant delete on table "public"."bucket_transactions" to "anon";

grant insert on table "public"."bucket_transactions" to "anon";

grant references on table "public"."bucket_transactions" to "anon";

grant select on table "public"."bucket_transactions" to "anon";

grant trigger on table "public"."bucket_transactions" to "anon";

grant truncate on table "public"."bucket_transactions" to "anon";

grant update on table "public"."bucket_transactions" to "anon";

grant delete on table "public"."bucket_transactions" to "authenticated";

grant insert on table "public"."bucket_transactions" to "authenticated";

grant references on table "public"."bucket_transactions" to "authenticated";

grant select on table "public"."bucket_transactions" to "authenticated";

grant trigger on table "public"."bucket_transactions" to "authenticated";

grant truncate on table "public"."bucket_transactions" to "authenticated";

grant update on table "public"."bucket_transactions" to "authenticated";

grant delete on table "public"."bucket_transactions" to "service_role";

grant insert on table "public"."bucket_transactions" to "service_role";

grant references on table "public"."bucket_transactions" to "service_role";

grant select on table "public"."bucket_transactions" to "service_role";

grant trigger on table "public"."bucket_transactions" to "service_role";

grant truncate on table "public"."bucket_transactions" to "service_role";

grant update on table "public"."bucket_transactions" to "service_role";

create policy "Users can insert transactions for their own buckets"
on "public"."bucket_transactions"
as permissive
for insert
to public
with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM buckets
  WHERE ((buckets.id = bucket_transactions.bucket_id) AND (buckets.user_id = auth.uid()))))));


create policy "Users can view their own transactions"
on "public"."bucket_transactions"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER process_transaction_before_insert BEFORE INSERT ON public.bucket_transactions FOR EACH ROW EXECUTE FUNCTION process_bucket_transaction();

CREATE TRIGGER update_bucket_transaction_updated_at BEFORE UPDATE ON public.bucket_transactions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();