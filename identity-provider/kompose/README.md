# Kubernetes Manifests for Identity Provider

This directory contains Kubernetes manifests generated using [Kompose](https://kompose.io/) from the Docker Compose quickstart configuration. These manifests deploy Ory Hydra (OAuth2 server), Ory Kratos (Identity server), and supporting services.

## Components

| Component | Description | Ports |
|-----------|-------------|-------|
| **Hydra** | OAuth2 and OpenID Connect server | 4444 (public), 4445 (admin) |
| **Kratos** | Identity and user management | 4433 (public), 4434 (admin) |
| **Kratos UI** | Self-service React UI for Kratos | 3000 |
| **Mailslurper** | Mock SMTP server for testing | 4436 (API), 4437 (UI) |

## Prerequisites

- Kubernetes cluster (local or remote)
- `kubectl` configured to connect to your cluster
- Sufficient storage for PersistentVolumeClaims

## Deployment Order

Apply the manifests in the following order to ensure dependencies are satisfied:

### Step 1: Create ConfigMaps

```bash
kubectl apply -f hydra-cm1-configmap.yaml
kubectl apply -f hydra-migrate-cm1-configmap.yaml
kubectl apply -f kratos-cm1-configmap.yaml
kubectl apply -f kratos-migrate-cm1-configmap.yaml
```

### Step 2: Create Persistent Volume Claims

```bash
kubectl apply -f hydra-sqlite-persistentvolumeclaim.yaml
kubectl apply -f kratos-sqlite-persistentvolumeclaim.yaml
```

### Step 3: Run Database Migrations

```bash
kubectl apply -f hydra-migrate-pod.yaml
kubectl apply -f kratos-migrate-pod.yaml
```

Wait for migrations to complete:

```bash
kubectl wait --for=condition=Ready pod/hydra-migrate --timeout=120s
kubectl wait --for=condition=Ready pod/kratos-migrate --timeout=120s
```

### Step 4: Deploy Services and Workloads

```bash
kubectl apply -f mailslurper-deployment.yaml
kubectl apply -f mailslurper-service.yaml
kubectl apply -f hydra-deployment.yaml
kubectl apply -f hydra-service.yaml
kubectl apply -f kratos-deployment.yaml
kubectl apply -f kratos-service.yaml
kubectl apply -f kratos-selfservice-ui-react-pod.yaml
kubectl apply -f kratos-selfservice-ui-react-service.yaml
```

## Quick Deploy (All at Once)

Alternatively, apply all manifests at once (not recommended for first-time setup):

```bash
kubectl apply -f .
```

## Verify Deployment

Check that all pods are running:

```bash
kubectl get pods
kubectl get services
```

Expected output should show all pods in `Running` state and services with their respective ports.

## Accessing Services

### Port Forwarding (Local Development)

```bash
# Hydra Public API
kubectl port-forward svc/hydra 4444:4444

# Hydra Admin API
kubectl port-forward svc/hydra 4445:4445

# Kratos Public API
kubectl port-forward svc/kratos 4433:4433

# Kratos Admin API
kubectl port-forward svc/kratos 4434:4434

# Kratos Self-Service UI
kubectl port-forward svc/kratos-selfservice-ui-react 3000:3000

# Mailslurper UI
kubectl port-forward svc/mailslurper 4437:4437
```

## Cleanup

Remove all resources:

```bash
kubectl delete -f .
```

## Manifest Files

| File | Type | Description |
|------|------|-------------|
| `hydra-cm1-configmap.yaml` | ConfigMap | Hydra configuration |
| `hydra-migrate-cm1-configmap.yaml` | ConfigMap | Hydra migration configuration |
| `hydra-sqlite-persistentvolumeclaim.yaml` | PVC | Storage for Hydra SQLite database |
| `hydra-migrate-pod.yaml` | Pod | Database migration job for Hydra |
| `hydra-deployment.yaml` | Deployment | Hydra OAuth2 server |
| `hydra-service.yaml` | Service | Exposes Hydra on ports 4444, 4445 |
| `kratos-cm1-configmap.yaml` | ConfigMap | Kratos configuration |
| `kratos-migrate-cm1-configmap.yaml` | ConfigMap | Kratos migration configuration |
| `kratos-sqlite-persistentvolumeclaim.yaml` | PVC | Storage for Kratos SQLite database |
| `kratos-migrate-pod.yaml` | Pod | Database migration job for Kratos |
| `kratos-deployment.yaml` | Deployment | Kratos identity server |
| `kratos-service.yaml` | Service | Exposes Kratos on ports 4433, 4434 |
| `kratos-selfservice-ui-react-pod.yaml` | Pod | React UI for self-service flows |
| `kratos-selfservice-ui-react-service.yaml` | Service | Exposes UI on port 3000 |
| `mailslurper-deployment.yaml` | Deployment | Mock email server |
| `mailslurper-service.yaml` | Service | Exposes Mailslurper on ports 4436, 4437 |

## Notes

- These manifests run in **development mode** (`--dev` flag). Do not use in production without proper configuration.
- SQLite is used as the database backend. For production, consider using PostgreSQL or MySQL.
- The migration pods have `restartPolicy: OnFailure` and will retry if they fail.
