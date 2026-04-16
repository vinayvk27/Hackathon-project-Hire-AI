import streamlit as st
import requests
import os

try:
    from audio_recorder_streamlit import audio_recorder
    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False

st.set_page_config(page_title="HR AI Engine", layout="wide")
st.title("HR Recruitment AI Dashboard")

tab1, tab2 = st.tabs(["JD Generator", "Resume Matcher"])

# --- Tab 1: JD Generator ---
with tab1:
    st.header("Generate Job Description")

    # --- Step 1: Brief Intent ---
    st.subheader("Step 1 — What role do you need?")
    intent = st.text_input(
        "Describe the role in one line:",
        placeholder="e.g. React developer with 3+ years for a fintech product",
    )

    if st.button("Get Questions"):
        if intent.strip():
            with st.spinner("Generating targeted questions..."):
                res = requests.post(
                    "http://172.20.10.3:8000/jobs/questions",
                    json={"intent": intent},
                )
            if res.status_code == 200:
                st.session_state.jd_questions = res.json().get("questions", [])
                st.session_state.jd_intent = intent
                st.session_state.pop("structured_jd", None)  # reset previous JD
            else:
                st.error("Failed to generate questions.")
        else:
            st.warning("Please enter a role description first.")

    # --- Step 2: Answer Questions ---
    if st.session_state.get("jd_questions"):
        st.divider()
        st.subheader("Step 2 — Answer a few questions")
        if AUDIO_AVAILABLE:
            st.caption("Type your answer or click the mic to speak. Use 🔊 to hear the question read aloud.")
        else:
            st.caption("The more detail you provide, the better the JD.")

        for i, question in enumerate(st.session_state.jd_questions):
            st.markdown(f"**Q{i+1}: {question}**")

            if AUDIO_AVAILABLE:
                col_text, col_mic, col_tts = st.columns([7, 1, 1])

                with col_text:
                    # Widget key is jd_typed_{i} — never touched by transcription
                    st.text_input(
                        label="answer",
                        label_visibility="collapsed",
                        placeholder="Type here, or use mic...",
                        key=f"jd_typed_{i}",
                    )

                with col_mic:
                    audio_bytes = audio_recorder(
                        text="",
                        recording_color="#e74c3c",
                        neutral_color="#6c757d",
                        icon_size="2x",
                        key=f"rec_{i}",
                    )

                with col_tts:
                    if st.button("🔊", key=f"tts_{i}", help="Read question aloud"):
                        tts_res = requests.post(
                            "http://172.20.10.3:8000/audio/speak",
                            json={"text": question},
                        )
                        if tts_res.status_code == 200:
                            st.audio(tts_res.content, format="audio/mpeg", autoplay=True)

                # Transcription handled OUTSIDE columns — safe to set session state here
                # because jd_transcribed_{i} is NOT a widget key
                if audio_bytes and len(audio_bytes) > 2000:
                    with st.spinner(f"Transcribing answer {i+1}..."):
                        transcribe_res = requests.post(
                            "http://172.20.10.3:8000/audio/transcribe",
                            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
                        )
                    if transcribe_res.status_code == 200:
                        st.session_state[f"jd_transcribed_{i}"] = transcribe_res.json().get("text", "")
                    else:
                        st.error("Transcription failed — please type your answer.")

                # Show voice transcription result (persists across reruns via session state)
                voice_answer = st.session_state.get(f"jd_transcribed_{i}", "")
                if voice_answer:
                    st.success(f"🎙️ Voice: {voice_answer}")

            else:
                st.text_input(
                    label="answer",
                    label_visibility="collapsed",
                    placeholder="Type your answer...",
                    key=f"jd_typed_{i}",
                )

            st.write("")

        # --- Answers summary ---
        st.divider()
        summary = {}
        for i, q in enumerate(st.session_state.jd_questions):
            voice  = st.session_state.get(f"jd_transcribed_{i}", "").strip()
            typed  = st.session_state.get(f"jd_typed_{i}", "").strip()
            answer = voice or typed
            if answer:
                summary[q] = answer

        if summary:
            with st.expander(f"Review your answers ({len(summary)}/{len(st.session_state.jd_questions)} answered)", expanded=True):
                for q, a in summary.items():
                    st.markdown(f"**Q:** {q}")
                    st.markdown(f"**A:** {a}")
                    st.write("")

        if st.button("Generate JD"):
            # Prefer voice transcription, fall back to typed text
            filled = {}
            for i, q in enumerate(st.session_state.jd_questions):
                voice = st.session_state.get(f"jd_transcribed_{i}", "").strip()
                typed = st.session_state.get(f"jd_typed_{i}", "").strip()
                answer = voice or typed
                if answer:
                    filled[q] = answer
            with st.spinner("Generating your Job Description..."):
                res = requests.post(
                    "http://172.20.10.3:8000/jobs/generate",
                    json={
                        "intent": st.session_state.jd_intent,
                        "answers": filled,
                    },
                )
            if res.status_code == 200:
                st.session_state.structured_jd = res.json()
                st.success("Job Description generated!")
            else:
                st.error("Failed to generate JD.")

    # --- Step 3: Review & Save ---
    if st.session_state.get("structured_jd"):
        st.divider()
        st.subheader("Step 3 — Review & Save")
        st.json(st.session_state.structured_jd)

        if st.button("Save JD to Database"):
            save_response = requests.post(
                "http://172.20.10.3:8000/jobs/create",
                json=st.session_state.structured_jd,
            )
            if save_response.status_code == 200:
                job_data = save_response.json()
                new_id = job_data.get("id")
                st.success(f"Job saved! Use **Job ID: {new_id}** in the Resume Matcher tab.")
                st.session_state.last_saved_id = new_id
            else:
                st.error("Failed to save job description.")

# --- Tab 2: Resume Matcher ---
with tab2:
    st.header("Match Candidates")

    uploaded_files = st.file_uploader("Upload Resumes (PDF only)", type=["pdf"], accept_multiple_files=True)

    if st.button("Upload & Process Resumes"):
        if uploaded_files:
            file_paths = []
            base_path = os.path.abspath("uploads")
            if not os.path.exists(base_path):
                os.makedirs(base_path)

            for uploaded_file in uploaded_files:
                file_path = os.path.join(base_path, uploaded_file.name)
                with open(file_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())
                file_paths.append(file_path)

            with st.spinner("AI is processing resumes..."):
                upload_response = requests.post(
                    "http://172.20.10.3:8000/candidates/upload",
                    json={"files": file_paths},
                )

            if upload_response.status_code == 200:
                st.success(f"Processed {len(file_paths)} resumes successfully!")
            else:
                st.error("Backend failed to process resumes.")
        else:
            st.warning("Please upload at least one PDF.")

    st.divider()

    job_id_input = st.text_input(
        "Enter Job ID (e.g., 1):",
        value=st.session_state.get("last_saved_id", ""),
    )

    if st.button("Find Best Matches"):
        if job_id_input:
            with st.spinner("Running vector search + LLM evaluation..."):
                response = requests.get(f"http://172.20.10.3:8000/candidates/match/{job_id_input}")

            if response.status_code == 200:
                data = response.json()
                job_title = data.get("job_title", "")
                domain = data.get("domain", "")
                matches = data.get("matches", [])

                st.markdown(f"### Top Candidates for: **{job_title}**")
                st.info(f"Domain detected by MCP Router: **{domain}**")

                if not matches:
                    st.warning("No matches found. Try uploading resumes first.")

                for rank, match in enumerate(matches, start=1):
                    ev = match.get("llm_evaluation", {})
                    llm_score = ev.get("overall_score", 0)
                    candidate_name = ev.get("candidate_name", match["source"])
                    vector_score_pct = f"{match['vector_score'] * 100:.1f}%"

                    # Colour-code the score badge
                    if llm_score >= 85:
                        badge = "🟢"
                    elif llm_score >= 70:
                        badge = "🟡"
                    elif llm_score >= 50:
                        badge = "🟠"
                    else:
                        badge = "🔴"

                    with st.container():
                        col1, col2, col3 = st.columns([4, 1, 1])
                        with col1:
                            st.subheader(f"#{rank} — {candidate_name}")
                            st.caption(f"File: {match['source']}")
                        with col2:
                            st.metric("LLM Score", f"{badge} {llm_score}/100")
                        with col3:
                            st.metric("Vector Match", vector_score_pct)

                        # Summary
                        if ev.get("summary"):
                            st.write(ev["summary"])

                        # Alignment metrics
                        alignment = ev.get("alignment_metrics", {})
                        if alignment:
                            m1, m2, m3 = st.columns(3)
                            m1.metric("Experience", f"{alignment.get('experience_score', 0)}/100")
                            m2.metric("Skills", f"{alignment.get('skill_score', 0)}/100")
                            m3.metric("Culture Fit", f"{alignment.get('cultural_potential', 0)}/100")

                        with st.expander("Full LLM Analysis"):
                            col_green, col_red = st.columns(2)
                            with col_green:
                                st.markdown("**Green Flags**")
                                for flag in ev.get("green_flags", []):
                                    st.markdown(f"- {flag}")
                            with col_red:
                                st.markdown("**Red Flags**")
                                for flag in ev.get("red_flags", []):
                                    st.markdown(f"- {flag}")

                            if ev.get("technical_depth_critique"):
                                st.markdown("**Technical Depth**")
                                st.write(ev["technical_depth_critique"])

                            missing = ev.get("missing_required_skills", [])
                            if missing:
                                st.markdown("**Missing Required Skills**")
                                st.write(", ".join(missing))

                        with st.expander("Resume Snippet"):
                            st.write(match["snippet"])

                        st.divider()
            else:
                detail = response.json().get("detail", "Failed to find matches")
                st.error(f"Error: {detail}")
        else:
            st.warning("Please enter a Job ID.")
