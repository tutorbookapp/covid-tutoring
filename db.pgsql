create domain url as text check (value ~* '^https?:\/\/\S+$');
create domain phone as text check (value ~* '^(\+\d{1,2})\d{10}$');
create domain email as text check (value ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');
create domain rrule as text check (value ~* '^RRULE:FREQ=(WEEKLY|DAILY);?(INTERVAL=2;?)?(UNTIL=(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?)?$');

create type aspect as enum ('mentoring', 'tutoring');
create type role as enum('tutor', 'tutee', 'mentor', 'mentee', 'parent');

create type social_type as enum('facebook', 'instagram', 'twitter');
create type social as (
  "type" social_type,
  "url" url
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
  "recur" rrule,
  "last" timestamptz
);

create type venue as (
  "id" text,
  "url" url
);

create type user_tag as enum ('meeting');
create table public.users (
  "id" uuid references auth.users(id) unique not null primary key,
  "name" text not null check(length(name) > 1 AND name !~ '\s'),
  "photo" url,
  "email" email unique,
  "phone" phone unique,
  "bio" text not null,
  "background" url,
  "venue" url, /* TODO: Set default URL to Jitsi venue. */
  "socials" social[] not null,
  "availability" timeslot[] not null,
  "mentoring" subjects not null,
  "tutoring" subjects not null,
  "langs" text[] not null check(cardinality(langs) > 0),
  "verifications" verification[] not null,
  "visible" boolean not null,
  "featured" aspect[] not null,
  "tags" user_tag[] not null,
  "reference" text not null,
  "timezone" text not null,
  "age" integer
);

create type profile_field as enum('name', 'photo', 'email', 'phone', 'bio', 'background', 'venue', 'availability', 'subjects', 'langs', 'reference'); 
create table public.orgs (
  "id" text unique not null primary key,
  "name" text not null check(length(name) > 1 AND name !~ '\s'),
  "photo" url not null,
  "email" email unique not null,
  "phone" phone unique not null,
  "bio" text,
  "background" url not null, 
  "venue" url not null,
  "socials" social[] not null,
  "aspects" aspect[] not null check(cardinality(aspects) > 0),
  "domains" text[],
  /* TODO: Check that at least one contact info field is included. */
  "profiles" profile_field[] not null check(cardinality(profiles) > 3),
  "subjects" text[],
  /* TODO: Verify these are valid config objects. */
  "signup" jsonb not null,
  "home" jsonb not null,
  "booking" jsonb not null,
  "matchURL" url
);

create type match_tag as enum('meeting');
create table public.matches (
  "id" bigint generated always as identity primary key,
  "org" text references public.orgs(id) not null,
  "creator" uuid references public.users(id) not null,
  "subjects" text[] not null check(cardinality(subjects) > 0),
  "message" text not null,
  "tags" match_tag[] not null
);

create type meeting_tag as enum('recurring');
create type meeting_status as enum('created', 'pending', 'logged', 'approved');
create table public.meetings (
  "id" bigint generated always as identity primary key,
  "org" text references public.orgs(id) not null,
  "creator" uuid references public.users(id) not null,
  "subjects" text[] not null check(cardinality(subjects) > 0),
  "status" meeting_status not null default 'created',
  "match" bigint references public.matches(id),
  "venue" venue not null,
  "time" timeslot not null,
  "description" text not null,
  "tags" meeting_tag[] not null
);

create schema relations;
create table relations.parent (
  "user" uuid references public.users(id),
  "parent" uuid references public.users(id)
);
create table relations.org (
  "user" uuid references public.users(id),
  "org" text references public.orgs(id)
);
create table relations.member (
  "user" uuid references public.users(id),
  "org" text references public.orgs(id)
);
create table relations.people (
  "user" uuid references public.users(id),
  "meeting" bigint references public.meetings(id),
  "roles" role[] not null check(cardinality(roles) > 0)
);
