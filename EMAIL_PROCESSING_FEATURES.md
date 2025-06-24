# Email Processing Features

## Overview

The system now supports intelligent email address processing that can:
1. **Extract contact information** from email addresses
2. **Research companies** using OpenAI to identify company details from domains
3. **Create comprehensive database records** for both contacts and companies
4. **Check email history** to understand communication patterns
5. **Set appropriate last_chat dates** based on email correspondence

## New Features

### 1. Intelligent Email Address Processing

When you provide an email address like `Rebecca.Li@aexp.com`, the system will:

- **Extract the name**: `Rebecca.Li` → `Rebecca Li` (proper formatting)
- **Identify the domain**: `aexp.com`
- **Research the company**: Uses OpenAI to determine that `aexp.com` = `American Express`
- **Check email history**: Searches Gmail for previous correspondence
- **Create database records**: Both company and contact records with proper linking

### 2. Company Domain Research

The system uses OpenAI to research company domains and provides:
- Full company name (e.g., `aexp.com` → `American Express`)
- Company type/industry (e.g., `Financial Services`)
- Brief company description
- Headquarters location (if known)
- Company size estimates
- Recent news or developments

### 3. Email History Analysis

For each email address, the system:
- Searches Gmail for previous correspondence
- Identifies the most recent email date
- Calculates communication frequency patterns
- Provides context about the relationship
- Sets the `last_chat` field automatically

### 4. Automatic Database Record Creation

The system intelligently creates:
- **Company records** with researched information
- **Contact records** linked to the company
- **Proper name formatting** (handles dots, underscores, etc.)
- **Last communication dates** from email history
- **Appropriate company types** based on domain research

## Usage Examples

### Basic Usage
```
"add Rebecca.Li@aexp.com"
```

**What happens:**
1. Extracts name: `Rebecca Li`
2. Researches domain: `aexp.com` → `American Express (Financial Services)`
3. Checks email history with `Rebecca.Li@aexp.com`
4. Creates company record for `American Express`
5. Creates contact record for `Rebecca Li` linked to American Express
6. Sets `last_chat` field based on email history

### Advanced Usage
```
"add Rebecca.Li@aexp.com and check when was the last email with her"
```

**Additional features:**
- Provides detailed email history analysis
- Shows communication frequency patterns
- Includes context from recent emails
- Suggests relationship status (active, moderate, infrequent, rare)

## Database Schema Updates

### Contacts Table
```sql
ALTER TABLE contacts ADD COLUMN last_chat TIMESTAMP;
```

### Companies Table
```sql
ALTER TABLE companies ADD COLUMN last_chat TIMESTAMP;
```

The `last_chat` field tracks:
- **For contacts**: Date of last email with that specific person
- **For companies**: Date of most recent email with any contact from that company

## Technical Implementation

### New Methods in OpenAI Service

#### `identifyCompanyFromDomain(domain)`
- Researches company information from domain
- Returns structured company data
- Uses OpenAI's knowledge base for accurate identification

#### `checkEmailHistory(email)`
- Searches Gmail for correspondence with specific email
- Analyzes communication patterns
- Returns formatted history information

#### Enhanced `generateDbOperations(userInstruction)`
- Detects email addresses in user instructions
- Automatically triggers company research and email history checks
- Generates comprehensive database operations
- Handles proper name formatting and company linking

### Email Address Pattern Recognition

The system recognizes various patterns:
- `"add Rebecca.Li@aexp.com"`
- `"create contact for john.doe@microsoft.com"`
- `"add sarah.johnson@goldman.com and check last email"`
- `"connect alex.chen@stripe.com to stripe"`

### Name Processing Rules

- `Rebecca.Li` → `Rebecca Li`
- `john.doe` → `John Doe`
- `sarah_johnson` → `Sarah Johnson`
- `alex-chen` → `Alex Chen`

Handles various separators and capitalizes properly.

### Company Type Mapping

The system intelligently maps domains to company types:
- `aexp.com` → `American Express` (Financial Services)
- `microsoft.com` → `Microsoft` (Technology)
- `goldman.com` → `Goldman Sachs` (Investment Banking)
- `stripe.com` → `Stripe` (Fintech)

## Error Handling

The system gracefully handles:
- **Domain research failures**: Falls back to basic company creation
- **Email history failures**: Creates contact without last_chat date
- **Gmail API limitations**: Provides appropriate error messages
- **Unknown domains**: Creates company with basic information

## Integration with Existing Features

### Email Triage
- Enhanced company research for inbound emails
- Better contact context for decision making
- Improved database suggestions

### LinkedIn Search
- Uses company information for better LinkedIn profile matching
- Leverages contact details for more accurate searches

### Database Operations
- Maintains fuzzy matching for contact names
- Preserves existing intelligent name variations
- Integrates with existing company and contact management

## Privacy and Security

- **Gmail Integration**: Uses existing OAuth tokens
- **OpenAI Calls**: Only sends domain names (not personal data)
- **Data Storage**: Follows existing database privacy patterns
- **Email Content**: Only processes metadata (dates, subjects, not full content)

## Performance Considerations

- **Parallel Processing**: Company research and email history run simultaneously
- **Caching**: Results can be cached to avoid duplicate API calls
- **Rate Limiting**: Respects Gmail API rate limits
- **Fallback Modes**: Continues operation even if some features fail

## Future Enhancements

Potential improvements:
1. **Bulk email processing** for multiple addresses
2. **Company hierarchy detection** (parent/subsidiary relationships)
3. **Contact deduplication** based on email patterns
4. **Advanced email analytics** (sentiment, topics, etc.)
5. **Integration with calendar** for meeting scheduling context

## Troubleshooting

### Common Issues

1. **Gmail not connected**: Ensure OAuth tokens are valid
2. **OpenAI API limits**: Check API key and usage limits
3. **Unknown domains**: System will create basic company records
4. **Name formatting**: System handles most common patterns automatically

### Debug Information

The system provides detailed logging:
- Company research progress
- Email history search results
- Database operation generation
- Error details with specific failure points

## Example Output

When processing `"add Rebecca.Li@aexp.com"`:

```json
{
  "operations": [
    {
      "action": "insert",
      "table": "companies",
      "payload": {
        "name": "American Express",
        "company_type_name": "Financial Services",
        "country": "United States"
      }
    },
    {
      "action": "insert", 
      "table": "contacts",
      "payload": {
        "name": "Rebecca Li",
        "email": "Rebecca.Li@aexp.com",
        "company_name": "American Express",
        "last_chat": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

This comprehensive system transforms simple email addresses into rich, connected database records with minimal user effort. 