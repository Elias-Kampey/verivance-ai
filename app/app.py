from pathlib import Path
import sys

import streamlit as st


# Let app/app.py import modules from the project root
PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from rag.retrieval import search


st.set_page_config(
    page_title="Verivance.ai",
    page_icon="🔎",
    layout="wide",
)

st.title("Verivance.ai")
st.subheader("Search with evidence.")

question = st.text_input(
    "Ask a question",
    placeholder="What do you want to research?",
)

if st.button("Search"):

    if question:

        with st.spinner("Searching sources..."):
            results = search(
                question,
                top_k=5,
                namespace="web",
            )

        st.subheader("Top Sources")

        for result in results:

            st.markdown(
                f"### #{result['rank']} — {result['title']}"
            )

            st.write(
                f"**Relevance Score:** {result['score']:.4f}"
            )

            st.markdown(
                f"**Source:** [{result['source']}]({result['source']})"
            )

            st.caption(
                f"Chunk ID: {result['chunk_id']}"
            )

            st.write(result["text"])

            st.divider()

    else:
        st.warning("Please enter a question.")