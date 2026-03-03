"""
MQTT Simulator — publishes fake room sensor data to the MQTT broker.
Replaces the old HTTP-based simulate-esp32.mjs.

Usage:
    pip install paho-mqtt
    python scripts/simulate-mqtt.py

    Or if MQTT broker is on a different host:
    python scripts/simulate-mqtt.py --broker 192.168.1.100
"""

import json
import time
import random
import argparse

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("❌ paho-mqtt not installed. Run: pip install paho-mqtt")
    exit(1)

BROKER = "localhost"
PORT = 1883
INTERVAL = 5  # seconds

temperature = 26.5
humidity = 62.0


def drift(current: float, target: float, min_val: float, max_val: float, volatility: float = 0.3) -> float:
    """Simulate natural sensor drift."""
    range_val = max_val - min_val
    noise = (random.random() - 0.5) * 2 * volatility * range_val * 0.02
    pull = (target - current) * 0.01
    new_val = current + noise + pull
    return max(min_val, min(max_val, new_val))


def main():
    global temperature, humidity

    parser = argparse.ArgumentParser(description="MQTT Sensor Simulator")
    parser.add_argument("--broker", default=BROKER, help=f"MQTT broker host (default: {BROKER})")
    parser.add_argument("--port", type=int, default=PORT, help=f"MQTT broker port (default: {PORT})")
    parser.add_argument("--interval", type=int, default=INTERVAL, help=f"Send interval in seconds (default: {INTERVAL})")
    args = parser.parse_args()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="simulator-room")

    print(f"🌱 MQTT Simulator — Room Temperature & Humidity")
    print(f"   Broker: {args.broker}:{args.port}")
    print(f"   Topic:  hidroponik/room")
    print(f"   Interval: {args.interval}s")
    print(f"   Press Ctrl+C to stop\n")

    try:
        client.connect(args.broker, args.port, 60)
        client.loop_start()
    except ConnectionRefusedError:
        print(f"❌ Cannot connect to MQTT broker at {args.broker}:{args.port}")
        print("   Make sure 'docker compose up' is running first!")
        exit(1)

    try:
        while True:
            temperature = drift(temperature, 26.5, 22, 34, 0.2)
            humidity = drift(humidity, 62, 40, 80, 0.2)

            payload = {
                "temperature": round(temperature, 1),
                "humidity": round(humidity, 1),
            }

            client.publish("hidroponik/room", json.dumps(payload))

            t = time.strftime("%H:%M:%S")
            print(f"[{t}] ✅ Published: Temp={payload['temperature']}°C  Humidity={payload['humidity']}%")

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
