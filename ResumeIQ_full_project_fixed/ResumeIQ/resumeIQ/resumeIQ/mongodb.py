from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")

db = client["resumeiq"]

users = db["users"]
jobs = db["jobs"]
job_drafts = db["job_drafts"]
applications = db["applications"]
notifications = db["notifications"]