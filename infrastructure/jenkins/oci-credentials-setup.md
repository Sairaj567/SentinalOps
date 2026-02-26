# SentinelOps - OCI Credentials Setup for Jenkins

## Prerequisites

1. OCI Account with appropriate permissions
2. Jenkins with OCI CLI installed
3. SSH key pair for instance access

## Required Jenkins Credentials

Add the following credentials in Jenkins (Manage Jenkins → Credentials → System → Global credentials):

### 1. OCI Tenancy OCID
- **ID**: `oci-tenancy-ocid`
- **Type**: Secret text
- **Value**: Your OCI Tenancy OCID (ocid1.tenancy.oc1..xxxxx)

### 2. OCI User OCID
- **ID**: `oci-user-ocid`
- **Type**: Secret text
- **Value**: Your OCI User OCID (ocid1.user.oc1..xxxxx)

### 3. OCI Fingerprint
- **ID**: `oci-fingerprint`
- **Type**: Secret text
- **Value**: Your API key fingerprint (xx:xx:xx:xx...)

### 4. OCI Private Key
- **ID**: `oci-private-key`
- **Type**: Secret file or Secret text
- **Value**: Contents of your OCI API private key (PEM format)

### 5. OCI Compartment OCID
- **ID**: `oci-compartment-ocid`
- **Type**: Secret text
- **Value**: Compartment OCID where resources will be created

### 6. SSH Public Key
- **ID**: `sentinelops-ssh-public-key`
- **Type**: Secret text
- **Value**: SSH public key for instance access

### 7. SSH Private Key
- **ID**: `sentinelops-ssh-private-key`
- **Type**: SSH Username with private key
- **Value**: SSH private key for instance access

## How to Get OCI Credentials

### Step 1: Get Tenancy OCID
1. Log into OCI Console
2. Go to Administration → Tenancy Details
3. Copy the OCID

### Step 2: Get User OCID
1. Go to Identity → Users
2. Click on your user
3. Copy the OCID

### Step 3: Generate API Key
1. Go to Identity → Users → Your User
2. Click "API Keys" under Resources
3. Click "Add API Key"
4. Choose "Generate API Key Pair"
5. Download both private and public keys
6. Copy the fingerprint shown

### Step 4: Get/Create Compartment
1. Go to Identity → Compartments
2. Create a new compartment or use existing
3. Copy the Compartment OCID

## Installing OCI CLI on Jenkins

```bash
# On Jenkins server/agent
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Or using pip
pip3 install oci-cli

# Verify installation
oci --version
```

## Jenkins Pipeline Configuration

1. Create a new Pipeline job in Jenkins
2. Point it to the Jenkinsfile at:
   `infrastructure/jenkins/Jenkinsfile.infrastructure`
3. Configure the parameters as needed

## Usage

### Deploy Infrastructure
```
Build with Parameters:
- ACTION: deploy
- ENVIRONMENT: dev
- VCN_CIDR: 10.0.0.0/16
```

### Check Status
```
Build with Parameters:
- ACTION: status
```

### Destroy Infrastructure
```
Build with Parameters:
- ACTION: destroy
```

## Instance Shapes Reference

| Shape | OCPUs | Memory | Use Case |
|-------|-------|--------|----------|
| VM.Standard.E4.Flex | 2 | 16 GB | Sentinel Server |
| VM.Standard.E4.Flex | 1 | 8 GB | Victim/Attacker |
| VM.Standard.A1.Flex | 1-4 | 6-24 GB | ARM-based (Always Free) |

## OCI Free Tier Resources

OCI offers Always Free resources:
- 2 AMD Compute VMs (1/8 OCPU, 1 GB memory each)
- 4 ARM Ampere A1 Compute instances (total 24 GB memory, 4 OCPUs)
- 200 GB Block Volume Storage
- 10 TB Outbound Data Transfer

For development/testing, consider using ARM instances to stay within free tier.
