```python
import requests
from datetime import datetime, timedelta

def run(**kwargs):
    # Get tomorrow's date
    today = datetime.today()
    tomorrow = today + timedelta(days=1)
    
    # Set time range for afternoon (14:00 - 16:00)
    start_time = "14:00"
    end_time = "16:00"

    # Simulate API call to Campus-Backend gRPC
    url = "https://campus-backend.com/api/rooms"
    params = {
        "date": tomorrow.strftime("%Y-%m-%d"),
        "start_time": start_time,
        "end_time": end_time
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        
        # Extract relevant room details from the API response
        rooms = []
        for room in data["rooms"]:
            room_id = room["id"]
            name = room["name"]
            capacity = room["capacity"]
            availability_status = "Available" if room["available"] else "Not Available"
            
            # Create card with extracted room details
            card = {
                'type': 'study_room',
                'title': f"{name} (ID: {room_id})",
                'body': f"Capacity: {capacity}\nAvailability Status: {availability_status}",
                'meta': '',
                'link': ''
            }
            
            rooms.append(card)
        
        # Return the card with extracted room details
        return {
            'status': 'success',
            'message': 'Study rooms found for tomorrow afternoon.',
            'card': {'type': 'study_room_list', 'title': 'Available Study Rooms', 'body': '', 'meta': '', 'link': ''},
            'rooms': rooms
        }
    else:
        return {
            'status': 'error',
            'message': f"Failed to retrieve study rooms. Status code: {response.status_code}",
            'card': {'type': '', 'title': '', 'body': '', 'meta': '', 'link': ''}
        }

```