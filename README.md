# Get Ducked API

Fastify + MongoDB REST API for QR codes. See `AGENTS.md` for product and architecture context.

## GCP & GitHub Actions (one-time setup)

The CI workflow (`.github/workflows/deploy.yml`) deploys with a **Firebase Admin SDK**–style service account JSON stored as **`FIREBASE_SERVICE_ACCOUNT`**. You repeat the steps below for **each** environment: **test** (`get-ducked-api-test`) and **production** (`get-ducked-api-prod`).

### 1. IAM roles on the deploy service account

On the service account you use for deploy (e.g. `firebase-adminsdk-…@PROJECT_ID.iam.gserviceaccount.com`), grant **in that GCP project**:

| Role | Why |
|------|-----|
| **Cloud Run Admin** (`roles/run.admin`) | Create and update Cloud Run services. |
| **Service Account User** (`roles/iam.serviceAccountUser`) | Lets deploy **act as** the **runtime** service account Cloud Run uses to run the container (often the default Compute Engine service account `PROJECT_NUMBER-compute@developer.gserviceaccount.com`). Without this, deploy fails with `iam.serviceaccounts.actAs` denied. You can grant this at **project** scope, or only on the specific runtime service account (least privilege). |
| **Artifact Registry Writer** (`roles/artifactregistry.writer`) | Push container images from GitHub Actions to Artifact Registry in this project. |

Apply the same three roles in **test** and **prod** projects if you use a **separate** service account per project (typical: one Firebase service account per Firebase/GCP project).

### 2. Artifact Registry repository

Create a **Docker** repository once per project (name and region must match the workflow):

- **Repository id:** `get-ducked-api`
- **Region:** `us-central1`
- **Format:** Docker

Example:

```bash
gcloud artifacts repositories create get-ducked-api \
  --repository-format=docker \
  --location=us-central1 \
  --project=YOUR_PROJECT_ID

  this is what i ran for test:
  gcloud artifacts repositories create get-ducked-api \
  --repository-format=docker \
  --location=us-central1 \
  --project=get-ducked-api-test
```

The test deploy image path is:

`us-central1-docker.pkg.dev/get-ducked-api-test/get-ducked-api/get-ducked-api:<git-sha>`

### 3. GitHub secrets

- **`FIREBASE_SERVICE_ACCOUNT`:** JSON key for the deploy service account. For the **build** job to push to Artifact Registry, this must be available as a **repository or organization** secret (not only an environment-only secret).
- Per environment (`test` / `production`): **`MONGODB_URI`**, **`JWT_SECRET`**, and any other env-specific values your workflow expects.

### Production image source (optional follow-up)

The workflow currently deploys **test** from Artifact Registry and **production** from **Docker Hub** (`docker.io/...`). If you want prod to pull only from GCP (same as test), add an Artifact Registry repo in the prod project, grant **Artifact Registry Writer** there, and point the prod deploy step at the prod image URL—mirror what you did for test.

---

**Summary:** Yes—**Cloud Run Admin**, **Service Account User** (for the runtime SA), and **Artifact Registry Writer** on your deploy (e.g. firebase-adminsdk) identity, plus **one Artifact Registry docker repo per project** (`get-ducked-api` in `us-central1`), configured **once for test and once for prod** as above.
