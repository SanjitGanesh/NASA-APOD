import streamlit as st
import streamlit.components.v1 as components
import requests
from datetime import datetime, date, timedelta
import random

# 1. Set Page Configuration (must be the first Streamlit command)
st.set_page_config(
    page_title="Cosmic Explorer - NASA APOD",
    page_icon="🌌",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 2. Session State Management for Date Selection
if "active_date" not in st.session_state:
    st.session_state.active_date = date.today()

# 3. Sidebar - Navigation & Controls
st.sidebar.markdown('<p style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0px; background: linear-gradient(90deg, #a78bfa, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"> Cosmic Control</p>', unsafe_allow_html=True)
st.sidebar.write("Travel through time to explore space as captured by NASA.")

# Date picker (controlled by session state)
selected_date = st.sidebar.date_input(
    "Select Date",
    value=st.session_state.active_date,
    min_value=date(1995, 6, 16), # NASA APOD start date
    max_value=date.today()
)

# Sync manual date picker interaction to st.session_state.active_date
if selected_date != st.session_state.active_date:
    st.session_state.active_date = selected_date

st.sidebar.write("") # Spacing

# Interactive Action Buttons
col_side1, col_side2 = st.sidebar.columns(2)

with col_side1:
    if st.button("Randomize !", use_container_width=True):
        start_date = date(1995, 6, 16)
        end_date = date.today()
        days_between = (end_date - start_date).days
        random_days = random.randint(0, days_between)
        random_date = start_date + timedelta(days=random_days)
        st.session_state.active_date = random_date
        st.session_state.date_picker = random_date
        st.rerun()

with col_side2:
    if st.button("Today", use_container_width=True):
        today = date.today()
        st.session_state.active_date = today
        st.session_state.date_picker = today
        st.rerun()

st.sidebar.markdown("---")
st.sidebar.markdown(
    """
    <div style="font-size: 0.85rem; color: #64748b; line-height: 1.4;">
    <strong>About this App</strong><br>
    Fetches the Astronomy Picture of the Day from NASA's planetary database.
    </div>
    """,
    unsafe_allow_html=True
)

# 4. Cached Data Fetch Function
@st.cache_data(show_spinner=False)
def fetch_apod_data(selected_date):
    date_str = selected_date.strftime("%Y-%m-%d")
    api_key = "nEKlezdG2FILT2Vud2TMgV2ValnrUXFhx7pCrOvw"
    url = f"https://api.nasa.gov/planetary/apod?api_key={api_key}&date={date_str}"
    
    try:
        response = requests.get(url, timeout=12)
        if response.status_code == 200:
            return response.json(), None
        elif response.status_code == 429:
            return None, "NASA API Rate limit reached. Try again with a different key or wait."
        else:
            try:
                err = response.json().get("error", {}).get("message", "Unknown API error.")
            except Exception:
                err = f"API returned status code {response.status_code}."
            return None, err
    except requests.exceptions.RequestException as e:
        return None, f"Network connection failed: {str(e)}"

# 5. Fetch NASA data first (so we know target media details before loading script.js)
data, error = fetch_apod_data(st.session_state.active_date)

# 6. Inject CSS Styles from style.css
try:
    with open("style.css", "r") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)
except Exception as e:
    st.error(f"Error loading stylesheet: {e}")

# 7. Inject JS Script from script.js with dynamic targets passed to JS
try:
    with open("script.js", "r") as f:
        js_content = f.read()
    
    # Destructure target media info
    target_url = ""
    target_type = ""
    if not error and data:
        target_url = data.get("url", "")
        target_type = data.get("media_type", "")
        
    rerun_token = str(random.random())
    js_args = f"""
    window.cosmicRerunToken = "{rerun_token}";
    window.cosmicTargetMediaUrl = "{target_url}";
    window.cosmicTargetMediaType = "{target_type}";
    """
    components.html(f"<script>{js_args}\n{js_content}</script>", height=0, width=0)
except Exception as e:
    st.error(f"Error loading interaction script: {e}")

# 8. Main App Content
st.markdown('<h1 class="gradient-text">Cosmic Explorer</h1>', unsafe_allow_html=True)
st.markdown('<p class="cosmic-subheader">Discover the cosmos, one day at a time</p>', unsafe_allow_html=True)

if error:
    st.error(f"🛰️ Communication Error: {error}")
    st.info("💡 Tip: Try clicking 'Randomize!' or selecting a different date from the sidebar.")
else:
    # Destructure APOD data
    title = data.get("title", "Untitled Cosmic Wonder")
    explanation = data.get("explanation", "No scientific explanation provided for this day's release.")
    media_type = data.get("media_type", "image")
    media_url = data.get("url")
    hd_url = data.get("hdurl")
    copyright_owner = data.get("copyright")
    date_str = data.get("date")
    
    # Format Date nicely
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        formatted_date = date_obj.strftime("%B %d, %Y")
    except Exception:
        formatted_date = date_str

    # Create wide double-column layout
    col_main1, col_main2 = st.columns([7, 7])
    
    # Left Column: Media Display
    with col_main1:
        if media_type == "image":
            if media_url:
                st.image(media_url, use_container_width=True)
                if hd_url:
                    st.markdown(
                        f'<a href="{hd_url}" target="_blank" class="hd-button">✨ View High Resolution (HD) Image</a>',
                        unsafe_allow_html=True
                    )
            else:
                st.warning("No image URL could be retrieved.")
        elif media_type == "video":
            if media_url:
                st.video(media_url)
            else:
                st.warning("No video URL could be retrieved.")
        else:
            st.info(f"The media type '{media_type}' is not natively embeddable, but you can view it directly:")
            if media_url:
                st.markdown(f"[🔗 View Media Source]({media_url})")

    # Right Column: Details & Scientific Explanation
    with col_main2:
        st.markdown(f'<h2 style="font-size: 1.85rem; font-weight: 600; line-height: 1.35; margin-top: 0px; color: #ffffff;">{title}</h2>', unsafe_allow_html=True)
        
        # Badges (Date and Copyright)
        st.markdown('<div class="badge-container">', unsafe_allow_html=True)
        st.markdown(f'<span class="badge">📅 {formatted_date}</span>', unsafe_allow_html=True)
        if copyright_owner:
            clean_copyright = copyright_owner.replace('\n', ' ').strip()
            st.markdown(f'<span class="badge badge-secondary">©️ {clean_copyright}</span>', unsafe_allow_html=True)
        else:
            st.markdown('<span class="badge badge-secondary">©️ Public Domain</span>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
        
        st.markdown("---")
        
        # Expander for Explanation (keeps layout clean)
        with st.expander("📖 Read Scientific Explanation", expanded=True):
            st.markdown('<div class="explanation-header">🔭 Astronomical Analysis</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="explanation-text">{explanation}</div>', unsafe_allow_html=True)