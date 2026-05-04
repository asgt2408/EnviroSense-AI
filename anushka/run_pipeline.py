
import time
from member4_model import run_pipeline


def main():
    print("🚀 Scheduler started...")

    while True:
        start_time = time.time()

        try:
            print("\n⏳ Running pipeline...")
            run_pipeline()
            print("✅ Pipeline executed successfully")

        except Exception as e:
            print("❌ Error occurred:", str(e))
            time.sleep(10)

        elapsed = time.time() - start_time
        sleep_time = max(60 - elapsed, 0)

        print(f"😴 Sleeping for {int(sleep_time)} sec...")
        time.sleep(sleep_time)


if __name__ == "__main__":
    main()

