import streamlit as st
import requests
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime
import time
import json

# Initialize session state
if 'events' not in st.session_state:
    st.session_state.events = []
if 'rooms' not in st.session_state:
    st.session_state.rooms = {}

# Configuration
ESP32_IP = st.sidebar.text_input('ESP32 IP Address', '192.168.4.1')
BASE_URL = f'http://{ESP32_IP}'

def fetch_room_data():
    try:
        response = requests.get(f'{BASE_URL}/data')
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f'Failed to connect to ESP32: {str(e)}')
        return []

def add_room(name, meas_pin, cutoff_pin, threshold):
    try:
        response = requests.post(
            f'{BASE_URL}/config',
            json={
                'action': 'add',
                'name': name,
                'measPin': meas_pin,
                'cutoffPin': cutoff_pin,
                'threshold': threshold
            }
        )
        if response.ok:
            st.success('Room added successfully')
        else:
            st.error('Failed to add room')
    except requests.exceptions.RequestException as e:
        st.error(f'Failed to connect to ESP32: {str(e)}')

def remove_room(name):
    try:
        response = requests.post(
            f'{BASE_URL}/config',
            json={'action': 'remove', 'name': name}
        )
        if response.ok:
            st.success('Room removed successfully')
        else:
            st.error('Failed to remove room')
    except requests.exceptions.RequestException as e:
        st.error(f'Failed to connect to ESP32: {str(e)}')

def update_threshold(name, threshold):
    try:
        response = requests.post(
            f'{BASE_URL}/config',
            json={'action': 'update', 'name': name, 'threshold': threshold}
        )
        if response.ok:
            st.success('Threshold updated successfully')
        else:
            st.error('Failed to update threshold')
    except requests.exceptions.RequestException as e:
        st.error(f'Failed to connect to ESP32: {str(e)}')

def reset_power(name):
    try:
        response = requests.post(
            f'{BASE_URL}/config',
            json={'action': 'reconnect', 'name': name}
        )
        if response.ok:
            st.success('Power reset successfully')
            # Log reset event
            st.session_state.events.append({
                'timestamp': datetime.now().isoformat(),
                'room': name,
                'event': 'Power Reset',
                'value': 0
            })
        else:
            st.error('Failed to reset power')
    except requests.exceptions.RequestException as e:
        st.error(f'Failed to connect to ESP32: {str(e)}')

# Main app
st.title('Power Monitoring Dashboard')

# Add Room Form in sidebar
with st.sidebar:
    st.header('Add New Room')
    with st.form('add_room'):
        name = st.text_input('Room Name')
        meas_pin = st.number_input('PZEM Reading Pin (GPIO)', min_value=0, max_value=39, value=25)
        cutoff_pin = st.number_input('Power Cutoff Pin (GPIO)', min_value=0, max_value=39, value=26)
        threshold = st.number_input('Power Threshold (W)', min_value=100.0, max_value=10000.0, value=2500.0)
        submit = st.form_submit_button('Add Room')
        if submit:
            add_room(name, meas_pin, cutoff_pin, threshold)

# Main content area
col1, col2 = st.columns([2, 1])

with col1:
    st.header('Power Readings')
    rooms_data = fetch_room_data()
    
    if rooms_data:
        for room in rooms_data:
            with st.expander(f"{room['name']} - {room['display_power']:.2f}W", expanded=True):
                # Update room data in session state
                if room['name'] not in st.session_state.rooms:
                    st.session_state.rooms[room['name']] = []
                st.session_state.rooms[room['name']].append({
                    'time': datetime.now(),
                    'power': room['display_power']
                })
                
                # Keep only last 100 readings
                st.session_state.rooms[room['name']] = st.session_state.rooms[room['name']][-100:]
                
                # Create power graph
                fig = go.Figure()
                room_data = st.session_state.rooms[room['name']]
                fig.add_trace(go.Scatter(
                    x=[d['time'] for d in room_data],
                    y=[d['power'] for d in room_data],
                    name='Power'
                ))
                fig.add_hline(
                    y=room['threshold'],
                    line_dash="dash",
                    line_color="red",
                    annotation_text="Threshold"
                )
                fig.update_layout(
                    height=300,
                    margin=dict(l=0, r=0, t=30, b=0),
                    xaxis_title="Time",
                    yaxis_title="Power (W)"
                )
                st.plotly_chart(fig, use_container_width=True)
                
                # Room controls
                col1, col2, col3 = st.columns(3)
                with col1:
                    new_threshold = st.number_input(
                        'New Threshold',
                        min_value=100.0,
                        max_value=10000.0,
                        value=float(room['threshold']),
                        key=f"threshold_{room['name']}"
                    )
                    if st.button('Update Threshold', key=f"update_{room['name']}"):
                        update_threshold(room['name'], new_threshold)
                
                with col2:
                    if st.button('Remove Room', key=f"remove_{room['name']}"):
                        remove_room(room['name'])
                
                with col3:
                    if room['isCutoff'] or room['bypassDetected']:
                        if st.button('Reset Power', key=f"reset_{room['name']}"):
                            reset_power(room['name'])
                
                # Status messages
                if room['isCutoff']:
                    st.error('⚠️ This room has exceeded threshold limit and has been cut off')
                    # Log cutoff event
                    st.session_state.events.append({
                        'timestamp': datetime.now().isoformat(),
                        'room': room['name'],
                        'event': 'Power Cutoff',
                        'value': room['display_power']
                    })
                
                if room['bypassDetected']:
                    st.warning('⚡ Warning: Potential bypass detected! Power readings detected after cutoff')
                    # Log bypass event
                    st.session_state.events.append({
                        'timestamp': datetime.now().isoformat(),
                        'room': room['name'],
                        'event': 'Bypass Detected',
                        'value': room['display_power']
                    })

with col2:
    st.header('Event Log')
    if st.button('Export Events'):
        # Convert events to DataFrame and download
        if st.session_state.events:
            df = pd.DataFrame(st.session_state.events)
            csv = df.to_csv(index=False)
            st.download_button(
                'Download CSV',
                csv,
                'power_events.csv',
                'text/csv'
            )
    
    # Display events
    for event in reversed(st.session_state.events[-10:]):  # Show last 10 events
        st.text(f"{event['timestamp']}")
        st.text(f"Room: {event['room']}")
        st.text(f"Event: {event['event']}")
        st.text(f"Power: {event['value']:.2f}W")
        st.markdown("---")

# Auto-refresh every 3 seconds
time.sleep(3)
st.experimental_rerun()