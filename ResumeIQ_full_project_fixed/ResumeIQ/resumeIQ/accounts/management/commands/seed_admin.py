from django.core.management.base import BaseCommand
from resumeIQ.mongodb import users


class Command(BaseCommand):
    help = "Creates the default admin user in MongoDB if it does not already exist."

    def handle(self, *args, **kwargs):
        existing = users.find_one({"email": "admin@resumeiq.com"})
        if existing:
            self.stdout.write(self.style.WARNING("Admin user already exists. Skipping."))
            return

        users.insert_one({
            "fullname": "Admin",
            "email": "admin@resumeiq.com",
            "password": "admin@123",
            "role": "admin"
        })
        self.stdout.write(self.style.SUCCESS("Admin user created successfully."))
        self.stdout.write("  Username : Admin")
        self.stdout.write("  Email    : admin@resumeiq.com")
        self.stdout.write("  Password : admin@123")
