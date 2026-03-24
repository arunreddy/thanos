def get_mock_response(question: str) -> str:
    q = question.lower()

    qa_data = [
        {
            "keywords": ["topic", "create", "modify", "portal"],
            "response": """Ah, I see what you mean. Let's fix that…

You can only view topics and schemas in the Kafka Self Service Portal by default. To get the power to create or modify topics and schemas, you need to:

- Raise a Sailpoint access request for the group "dso-kafka-portal-app-admin"
- Once your access is approved, log out and log back in (or clear your browser cache) to activate your new permissions

Until you have that admin access, you're stuck in "read-only" mode—no rockstar moves like creating or editing topics for you just yet!

**Sources:**
- [Kafka integration process](/spaces/STREAM/pages/207135684/Kafka+integration+process)
- [Kafka use case integration process](/spaces/STREAM/pages/582802270/Kafka+use+case+integration+process)"""
        },
        {
            "keywords": ["integration", "issue", "help", "jira"],
            "response": """Boom! Here's how you get help with an existing Kafka integration issue:

- **Create a Jira ticket** for the Kafka team. The recommended way is to clone the Jira story **EDE-203568** for your issue.
- Make sure to attach logs and provide a summary and details about your issue in the ticket.

You can find this process in the Kafka integration documentation. If you're feeling extra, you can also use the Kafka Self Service Portal for existing integrations.

Rock on! :guitar:

**Sources:**
- [Kafka integration process](/spaces/STREAM/pages/207135684/Kafka+integration+process)
- [Issues with Kafka Integration?](/spaces/STREAM/pages/420610323/Issues+with+Kafka+Integration)"""
        },
        {
            "keywords": ["service account", "api key", "sysid"],
            "response": """Rock on! Here's what you need for Service Account and API key creation:

- **SYSID** (System ID) and **App Name/Description** are required inputs when creating a Service Account.
- When you create a Service Account, an **API key and secret** are generated for it. You'll need to save these right away—this is the only time you'll see them!
- Make sure you store the API key and secret securely (like in a vault), since you'll need them to configure your Kafka client applications.
- Remember: Service Account names can't be changed after creation, so get it right the first time.

Boom! That's your Service Account starter pack. :the_horns:

**Sources:**
- [Service Accounts](/spaces/STREAM/pages/120792089/Service+Accounts)
- [3.1.1 Create Service Account](/spaces/STREAM/pages/235608292/3.1.1+Create+Service+Account)"""
        },
        {
            "keywords": ["authentication", "authorization", "auth", "okta", "ad group"],
            "response": """Rock on! Here's how authentication and authorization are handled in the Kafka Self Service Portal:

- **Authentication** is done via SSO/Okta. When you log in, Okta authenticates you and passes your AD group memberships to the portal.
- **Authorization** is managed using AD Groups. Your group membership determines what you can do in the portal.
- To access the portal (even just to view), you must follow the SailPoint Access request process to get added to the right AD group.
- For create/modify/delete powers, you need to be in the Admin AD group (typically as a Lead Developer), which also requires a SailPoint request.
- The portal uses LDAP to verify email addresses when developers enter approver emails.

Boom! That's the backstage pass to portal access. :the_horns:

**Sources:**
- [Kafka Self Service Portal 2.0 - Solution Design](/spaces/STREAM/pages/348189939/Kafka+Self+Service+Portal+2.0+-+Solution+Design)
- [Kafka Self Service Portal 2.0 - Solution Approach](/spaces/STREAM/pages/353900318/Kafka+Self+Service+Portal+2.0+-+Solution+Approach)"""
        }
    ]

    # Matching logic: count keyword hits
    best_match = None
    best_score = 0

    for item in qa_data:
        score = sum(1 for kw in item["keywords"] if kw in q)

        if score > best_score:
            best_score = score
            best_match = item

    # Require at least 1 keyword match
    if best_score >= 1:
        return best_match["response"]

    return "No matching answer found."


# Example
# print(get_mock_response("I cannot create topic in kafka portal"))
