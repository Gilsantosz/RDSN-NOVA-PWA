**Welcome to your RDSN project** 

**About**

View and Edit your app on [RDSN.com](http://RDSN.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the RDSN Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```bash
# RDSN Project Configuration (v2.0.0)
VITE_RDSN_APP_ID=your_app_id

# Supabase Configuration
VITE_RDSN_SUPABASE_URL=your_supabase_url
VITE_RDSN_SUPABASE_ANON_KEY=your_anon_key
VITE_RDSN_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Functions Versioning
VITE_RDSN_FUNCTIONS_VERSION=v1
```

e.g.
```
VITE_RDSN_APP_ID=cbef744a8545c389ef439ea6
VITE_RDSN_SUPABASE_URL=https://your-project.supabase.co
VITE_RDSN_SUPABASE_ANON_KEY=your-anon-key
```

Run the app: `npm run dev`

**Publish your changes**

Open [RDSN.com](http://RDSN.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.rdsn.com/Integrations/Using-GitHub](https://docs.rdsn.com/Integrations/Using-GitHub)

Support: [https://app.rdsn.com/support](https://app.rdsn.com/support)
