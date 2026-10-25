# BACKEND_MASTER_PROMPT.md

# Part 4

## Admin System

## Analytics

## Monitoring

## Docker

## CI/CD

## Production Deployment

## Scaling

Version

1.0

---

# ADMIN MODULE

Build an enterprise-grade admin system.

Never expose admin routes publicly.

Use RBAC for every endpoint.

Support

* Super Admin
* Admin
* Moderator
* Finance Admin
* Support Admin

Every action must be permission-based.

---

# ADMIN FEATURES

Users

Hosts

KYC

Events

Bookings

Payments

Refunds

Wallets

Reports

Support

Analytics

CMS

Feature Flags

System Settings

Audit Logs

Announcements

Email Templates

Push Templates

---

# ADMIN DASHBOARD

Dashboard Widgets

Today's Revenue

Today's Bookings

Pending KYC

Pending Reports

Active Hosts

Live Events

Cancelled Events

Conversion Rate

Average Rating

Trust Score Distribution

Monthly Growth

System Health

Queue Status

Redis Status

Database Status

---

# ANALYTICS MODULE

Generate analytics services.

Support

Daily

Weekly

Monthly

Yearly

Metrics

Revenue

Users

Hosts

Events

Bookings

Attendance

Cancellation

Refunds

Trust Score

Top Cities

Top Categories

Top Hosts

Retention

---

# REPORTING

Generate

CSV Export

Excel Export

PDF Export

Scheduled Reports

Revenue Report

Host Report

Booking Report

Tax Report

Refund Report

---

# AUDIT SYSTEM

Log

Every Login

Every Logout

Admin Actions

Permission Changes

Payment Changes

Refunds

Verification Changes

Booking Changes

Configuration Changes

Never allow audit logs to be edited.

---

# FEATURE FLAGS

Support

Enable

Disable

Percentage Rollout

Region Rollout

Beta Users

Future

A/B Testing

---

# CMS

Dynamic

Landing Page

FAQ

Privacy Policy

Terms

Categories

Cities

Homepage Banner

Marketing Pages

Blog

SEO Metadata

---

# SEARCH SERVICE

Abstract search behind a service.

Current

PostgreSQL

Future

Meilisearch

Elasticsearch

Never tightly couple controllers to a search engine.

---

# CACHE LAYER

Redis

Cache

Categories

Cities

Featured Events

Host Profiles

Event Details

Dashboard Statistics

Invalidate cache automatically.

---

# FILE STORAGE

AWS S3

Private Bucket

Public Bucket

Generate signed URLs.

Optimize images.

Future

CDN

CloudFront

---

# EMAIL SYSTEM

Queue emails.

Retry failed deliveries.

Track delivery status.

Support templates.

Never send emails synchronously.

---

# PUSH SYSTEM

Queue notifications.

Retry failed pushes.

Track delivery.

Store notification history.

---

# QUEUES

BullMQ

Queues

Email

Payments

Notifications

Reports

Analytics

Image Processing

Video Processing (future)

Search Index

Trust Score

Settlement

Cleanup

Retry

Dead Letter Queue

---

# CRON JOBS

Every Minute

Expired OTP

Expired Tokens

Queue Health

Every Hour

Booking Expiry

Reminder Emails

Reminder Push

Every Day

Wallet Settlement

Trust Score Update

Analytics Aggregation

Cleanup

Every Week

Reports

Inactive Users

Failed Upload Cleanup

Every Month

Revenue Report

Finance Report

Host Ranking

---

# MONITORING

Use

Pino

Health Checks

Request Metrics

Error Metrics

Latency

Memory

CPU

Redis

Database

Queue Health

Future

Prometheus

Grafana

OpenTelemetry

Sentry

---

# LOGGING

Log

Request

Response

Errors

Payments

Authentication

Queue Jobs

Cron Jobs

Never log

Passwords

JWT

OTP

KYC

Card Data

Secrets

---

# DOCKER

Generate

Dockerfile

Docker Compose

Development

Production

Services

Backend

PostgreSQL

Redis

Adminer (Development)

Mailpit (Development)

Volumes

Health Checks

Environment Variables

---

# CI/CD

GitHub Actions

Pipeline

Install

Lint

Type Check

Unit Tests

Build

Docker Build

Deploy

Notify

Branch Strategy

main

develop

feature/*

release/*

hotfix/*

---

# TESTING

Use

Vitest

Supertest

Coverage Target

90%+

Test

Controllers

Services

Repositories

Middleware

Queues

Payments

Bookings

Wallet

Authentication

---

# DEPLOYMENT

Production

Ubuntu

Node.js

PM2

NGINX

SSL

Cloudflare

Database

Managed PostgreSQL

Redis

Managed Redis

Storage

AWS S3

Backups

Daily

Weekly

Monthly

---

# OBSERVABILITY

Health Endpoints

GET /health

GET /ready

GET /live

Return

Application

Database

Redis

Queue

Version

Environment

Build Number

---

# SCALABILITY

Support

10 Million Users

100 Million Bookings

50 Million Payments

1000 Requests / Second

Horizontal Scaling

Stateless API

Redis Cache

Background Jobs

Read Replicas

CDN

Future Microservices

---

# SECURITY

HTTPS

Helmet

CORS

Rate Limiting

Input Validation

Output Sanitization

RBAC

Audit Logs

Secret Rotation

Environment Validation

Secure Headers

Signed URLs

Encryption at Rest

Encryption in Transit

---

# PERFORMANCE

Target

Average Response

<200ms

95th Percentile

<500ms

Cold Start

Minimal

Image Optimization

Compression

Database Indexes

Redis

Pagination

Cursor Pagination

Streaming for exports

---

# MICROSERVICE READY

Future Services

Auth

Users

Hosts

Events

Bookings

Payments

Wallet

Notifications

Reviews

Reports

Analytics

Search

AI

Chat

Community

Do not implement as microservices now.

Design modules so they can be extracted later.

---

# FINAL ENGINEERING RULES

Never place business logic in controllers.

Never access Prisma directly from controllers.

Never expose internal errors.

Always validate requests.

Always use transactions for financial operations.

Always log critical events.

Always queue long-running tasks.

Always write tests.

Always document APIs.

Always think about backward compatibility.

Always optimize for maintainability.

Always build production-ready code.

---

# SUCCESS CRITERIA

The backend should be able to power:

* Next.js Website
* React Native Mobile App
* Admin Dashboard
* Future Public APIs

using one secure, scalable, and maintainable backend.

The architecture should remain stable as the platform grows from MVP to millions of users without requiring a complete rewrite.
