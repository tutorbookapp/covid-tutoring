create type aspect as enum ('mentoring', 'tutoring');
create type tag as enum ('meeting');

create type social_type as enum('facebook', 'instagram', 'twitter');
create type social as (
  "type" social_type,
  "url" text /* TODO: Verify that this is a URL. */
);

create type subjects as (
  "subjects" text[],
  "searches" text[]
);

create type verification as (
  "created" timestamptz,
  "updated" timestamptz
);

create type timeslot as (
  "id" uuid,
  "from" timestamptz,
  "to" timestamptz,
  "exdates" timestamptz[],
  "recur" text, /* TODO: Verify this is a valid RRule. */
  "last" timestamptz
);

create schema relations;
create table relations.parent (
  "child" uuid references public.users(id),
  "parent" uuid references public.users(id)
);
create table relations.org (
  "org" text references public.orgs(id),
  "user" uuid references public.users(id)
);
create table relations.member (
  "org" text references public.orgs(id),
  "member" uuid references public.users(id)
);

create table public.users (
  "id" uuid references auth.users(id) not null,
  "name" text not null check(length(name) > 1 AND name !~ '\s'),
  "photo" text, /* TODO: Verify this is a valid Supabase storage URL. */
  "email" text unique not null, /* TODO: Verify this is an email address. */
  "phone" text unique not null, /* TODO: Verify this is a phone number. */
  "bio" text,
  "background" text, /* TODO: Verify that this is a valid Supabase storage URL. */
  "venue" text, /* TODO: Verify that this is a URL. */
  "socials" social[] not null,
  "availability" timeslot[] not null,
  "mentoring" subjects,
  "tutoring" subjects,
  "langs" text[] not null check(cardinality(langs) > 0),
  "verifications" verification[],
  "visible" boolean not null,
  "featured" aspect[] not null,
  "tags" tag[] not null,
  "reference" text,
  "timezone" text,
  "age" integer
);

create table public.orgs (
  "id" text unique not null primary key,
  "name" text not null check(length(name) > 1 AND name !~ '\s'),
  "photo" text, /* TODO: Verify this is a valid Supabase storage URL. */
  "email" text unique not null, /* TODO: Verify this is an email address. */
  "phone" text unique not null, /* TODO: Verify this is a phone number. */
  "bio" text,
  "background" text, /* TODO: Verify that this is a valid Supabase storage URL. */
  "venue" text, /* TODO: Verify that this is a URL. */
  "socials" social[] not null,
  "aspects" aspect[] not null check(cardinality(aspects) > 0),
  "domains" text[],
  "profiles"  
);
