# Local test accounts (this PC's database only — never commit)

| Email | Password | Kind |
|---|---|---|
| staff.test@tanzim.test | Tz-sPQlbXxo33UlgoWs | Platform staff (super admin), no company — /admin/companies and /admin/billing |

Reset it if needed (backend folder):

    venv/Scripts/python.exe manage.py changepassword staff.test@tanzim.test
