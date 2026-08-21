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


        st.divider()
st.subheader("Demo Sources")

with open("data/sources.txt", "r") as file:
    sources = [line.strip() for line in file if line.strip()]

for i, source in enumerate(sources, start=1):
    st.markdown(f"{i}. [{source}]({source})")