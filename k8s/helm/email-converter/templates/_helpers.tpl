{{/*
=============================================================================
Email Converter Helm Helpers
=============================================================================
Common template functions used across all Kubernetes manifests
=============================================================================
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "email-converter.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "email-converter.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "email-converter.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "email-converter.labels" -}}
helm.sh/chart: {{ include "email-converter.chart" . }}
{{ include "email-converter.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: email-converter
environment: {{ .Values.global.environment | default "development" }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "email-converter.selectorLabels" -}}
app.kubernetes.io/name: {{ include "email-converter.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service account name
*/}}
{{- define "email-converter.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "email-converter.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image repository prefix
*/}}
{{- define "email-converter.imagePrefix" -}}
{{- printf "%s/%s" .Values.global.imageRegistry .Values.global.imageRepository }}
{{- end }}

{{/*
API image
*/}}
{{- define "email-converter.apiImage" -}}
{{- printf "%s/api:%s" (include "email-converter.imagePrefix" .) (.Values.api.image.tag | default .Chart.AppVersion) }}
{{- end }}

{{/*
Celery Worker image
*/}}
{{- define "email-converter.workerImage" -}}
{{- printf "%s/celery-worker:%s" (include "email-converter.imagePrefix" .) (.Values.celeryWorker.image.tag | default .Chart.AppVersion) }}
{{- end }}

{{/*
Celery Beat image
*/}}
{{- define "email-converter.beatImage" -}}
{{- printf "%s/celery-beat:%s" (include "email-converter.imagePrefix" .) (.Values.celeryBeat.image.tag | default .Chart.AppVersion) }}
{{- end }}

{{/*
Flower image
*/}}
{{- define "email-converter.flowerImage" -}}
{{- printf "%s/flower:%s" (include "email-converter.imagePrefix" .) (.Values.flower.image.tag | default .Chart.AppVersion) }}
{{- end }}

{{/*
PostgreSQL connection string
*/}}
{{- define "email-converter.databaseUrl" -}}
{{- printf "postgresql+asyncpg://%s:%s@%s.%s.svc.cluster.local:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password .Release.Name .Release.Namespace .Values.postgresql.auth.database }}
{{- end }}

{{/*
Redis connection string
*/}}
{{- define "email-converter.redisUrl" -}}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:%s@%s-redis-master.%s.svc.cluster.local:6379/0" .Values.redis.auth.password .Release.Name .Release.Namespace }}
{{- else }}
{{- printf "redis://%s-redis-master.%s.svc.cluster.local:6379/0" .Release.Name .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
Celery broker URL (Redis DB 1)
*/}}
{{- define "email-converter.celeryBrokerUrl" -}}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:%s@%s-redis-master.%s.svc.cluster.local:6379/1" .Values.redis.auth.password .Release.Name .Release.Namespace }}
{{- else }}
{{- printf "redis://%s-redis-master.%s.svc.cluster.local:6379/1" .Release.Name .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
Celery result backend URL (Redis DB 2)
*/}}
{{- define "email-converter.celeryResultBackend" -}}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:%s@%s-redis-master.%s.svc.cluster.local:6379/2" .Values.redis.auth.password .Release.Name .Release.Namespace }}
{{- else }}
{{- printf "redis://%s-redis-master.%s.svc.cluster.local:6379/2" .Release.Name .Release.Namespace }}
{{- end }}
{{- end }}

{{/*
MinIO endpoint
*/}}
{{- define "email-converter.minioEndpoint" -}}
{{- printf "http://%s-minio.%s.svc.cluster.local:9000" .Release.Name .Release.Namespace }}
{{- end }}

{{/*
Prometheus endpoint
*/}}
{{- define "email-converter.prometheusEndpoint" -}}
{{- printf "http://%s-prometheus.%s.svc.cluster.local:9090" .Release.Name .Release.Namespace }}
{{- end }}

{{/*
Grafana endpoint
*/}}
{{- define "email-converter.grafanaEndpoint" -}}
{{- printf "http://%s-grafana.%s.svc.cluster.local:3000" .Release.Name .Release.Namespace }}
{{- end }}

{{/*
Loki endpoint
*/}}
{{- define "email-converter.lokiEndpoint" -}}
{{- printf "http://%s-loki.%s.svc.cluster.local:3100" .Release.Name .Release.Namespace }}
{{- end }}

{{/*
OTEL collector endpoint
*/}}
{{- define "email-converter.otelEndpoint" -}}
{{- printf "http://%s-otel-collector.%s.svc.cluster.local:4317" .Release.Name .Release.Namespace }}
{{- end }}

{{/*
Namespace
*/}}
{{- define "email-converter.namespace" -}}
{{- default .Release.Namespace .Values.global.namespace }}
{{- end }}
