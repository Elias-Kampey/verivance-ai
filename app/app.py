import streamlit as st

st.set_page_config(
    page_title="Verivance.ai",
    page_icon="🔎",
    layout="wide"
)

st.title("Verivance.ai")
st.subheader("Search with evidence.")

question = st.text_input(
    "Ask a question",
    placeholder="What do you want to research?"
)

if st.button("Search"):
    if question:
        st.write("Searching sources...")
    else:
        st.warning("Please enter a question.")