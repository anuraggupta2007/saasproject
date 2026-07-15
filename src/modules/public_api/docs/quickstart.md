# Quick Start Guide

## 1. Get Your API Key

1. Sign up at https://app.emailconverter.com
2. Navigate to **Settings → API Keys**
3. Click **Create API Key**
4. Copy your key (starts with `ec_live_`)

## 2. Make Your First Request

### Using cURL

```bash
# Health check
curl -H "Authorization: Bearer ec_live_your_key" \
     https://api.emailconverter.com/api/public/v1/health

# Get your profile
curl -H "Authorization: Bearer ec_live_your_key" \
     https://api.emailconverter.com/api/public/v1/users/me
```

### Using Python SDK

```bash
pip install email-converter-sdk
```

```python
from email_converter import EmailConverterClient

client = EmailConverterClient(api_key="ec_live_your_key")

# Health check
print(client.health_check())

# Get profile
print(client.get_profile())
```

### Using JavaScript SDK

```bash
npm install email-converter-sdk
```

```javascript
import { EmailConverterClient } from 'email-converter-sdk';

const client = new EmailConverterClient({ apiKey: 'ec_live_your_key' });

// Health check
const health = await client.healthCheck();
console.log(health);

// Get profile
const profile = await client.getProfile();
console.log(profile);
```

## 3. Upload and Convert an Email File

```python
from email_converter import EmailConverterClient

client = EmailConverterClient(api_key="ec_live_your_key")

# Step 1: Create upload
upload = client.create_upload("my_emails.mbox", 1024000)
print(f"Upload ID: {upload.id}")

# Step 2: Upload file (if needed)
client.upload_file(upload.id, "/path/to/my_emails.mbox")

# Step 3: Start conversion
conversion = client.create_conversion(upload.id, "pdf")
print(f"Conversion ID: {conversion.id}")

# Step 4: Wait for completion
result = client.convert_and_wait(upload.id, "pdf")
print(f"Download URL: {result.download_url}")
```

## 4. Search Emails

```python
# Search for emails from a specific sender
results = client.search("from:alice@example.com subject:report")
print(f"Found {results.total_results} results")

for result in results.results:
    print(f"  - {result.subject} ({result.date})")
```

## 5. Set Up Webhooks

```python
# Create webhook for conversion events
webhook = client.create_webhook(
    url="https://your-server.com/webhook",
    events=["conversion.completed", "conversion.failed"]
)
print(f"Webhook Secret: {webhook.secret}")

# Verify incoming webhooks
from email_converter import EmailConverterClient
valid = EmailConverterClient.verify_webhook_signature(
    payload=request.body,
    signature=request.headers["X-Webhook-Signature"],
    secret=webhook.secret
)
```

## 6. Use the CLI

```bash
# Health check
python cli/email_converter_cli.py --api-key ec_live_your_key health

# Upload file
python cli/email_converter_cli.py --api-key ec_live_your_key upload myfile.mbox

# Convert to PDF
python cli/email_converter_cli.py --api-key ec_live_your_key convert <upload_id> pdf

# Check status
python cli/email_converter_cli.py --api-key ec_live_your_key status <conversion_id>

# Search emails
python cli/email_converter_cli.py --api-key ec_live_your_key search "from:alice@example.com"

# List webhooks
python cli/email_converter_cli.py --api-key ec_live_your_key webhooks
```

## Next Steps

- Read the [full API documentation](api-documentation.md)
- Explore SDK source code in the `sdks/` directory
- Set up webhook event handling for production use
- Review rate limits for your tier
