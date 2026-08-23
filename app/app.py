from pathlib import Path
import sys

import pandas as pd
import streamlit as st


# Let app/app.py import modules from the project root
PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from rag.retrieval import search
from rag.generation import generate_answer


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

        # Step 1: Retrieve evidence
        with st.spinner("Searching sources..."):
            results = search(
                question,
                top_k=5,
                namespace="web",
            )

        # Step 2: Generate grounded answer
        with st.spinner("Generating evidence-based answer..."):
            answer = generate_answer(
                question,
                results,
            )

        # Answer section
        st.subheader("Answer")

        with st.container(border=True):
            st.markdown(answer)

        # Ranking chart
        st.subheader("Retrieval Ranking")

        chart_data = pd.DataFrame(
            {
                "Source": [
                    f"#{result['rank']}"
                    for result in results
                ],
                "Relevance": [
                    result["score"]
                    for result in results
                ],
            }
        )

        st.bar_chart(
            chart_data,
            x="Source",
            y="Relevance",
        )

        # Evidence cards
        st.subheader("Evidence Retrieved")

        for result in results:
            with st.container(border=True):

                st.markdown(
                    f"### #{result['rank']} — {result['title']}"
                )

                col1, col2 = st.columns([1, 3])

                with col1:
                    st.metric(
                        "Relevance",
                        f"{result['score']:.3f}",
                    )

                with col2:
                    st.markdown(
                        f"[Open original source]({result['source']})"
                    )

                    st.caption(
                        f"Chunk: {result['chunk_id']}"
                    )

                st.write(result["text"])

    else:
        st.warning("Please enter a question.")