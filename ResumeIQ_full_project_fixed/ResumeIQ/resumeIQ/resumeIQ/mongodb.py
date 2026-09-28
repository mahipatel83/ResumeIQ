import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))

db = client["resumeiq"]

users = db["users"]
jobs = db["jobs"]
job_drafts = db["job_drafts"]
applications = db["applications"]
notifications = db["notifications"]
