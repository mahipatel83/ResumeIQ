from resumeIQ.mongodb import users
for u in users.find():
    print(f"Name: {u.get('fullname')}, Email: {u.get('email')}, Role: {u.get('role')}")
