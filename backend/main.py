from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "Bank API is Online"}