import asyncio
import aiohttp
from aiohttp import ClientSession, ClientTimeout
import cv2


async def call_model():
    timeout_seconds = 1
    timeout = ClientTimeout(total=timeout_seconds)
    port = 8886  # TODO: Don't hardcode this
    host = 'localhost'
    endpoint = f'http://{host}:{port}/predict'
    async with ClientSession(timeout=timeout) as session:
        image_path = '/Users/ryanzotti/Documents/Data/Self-Driving-Car/diy-robocars-carpet/data/dataset_2_18-10-20/1385_cam-image_array_.png'
        raw_image = cv2.imread(image_path, 1)
        img = cv2.imencode('.jpg', raw_image)[1].tostring()
        files = {'image': img}
        async with session.post(endpoint, data=files) as response:
            output_json = await response.json()
        print(output_json)


asyncio.run(call_model())
print('Finished')
