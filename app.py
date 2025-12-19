import streamlit as st
import openai
from duckduckgo_search import DDGS
import requests
import time
from datetime import datetime
from github import Github
import json # <--- NIEUW: Nodig om blueprints te lezen

# --- 1. CONFIGURATIE ---
st.set_page_config(page_title="Aphex II: Architect", page_icon="🏗️", layout="wide", initial_sidebar_state="collapsed")

# --- 2. STYLING ---
st.markdown("""
    <style>
    .stApp { background-color: #0e1117; color: #c9d1d9; }
    .stTextInput>div>div>input, .stTextArea>div>div>textarea { background-color: #161b22; color: white; border: 1px solid #30363d; }
    footer { visibility: hidden; }
    .stChatInput { position: fixed; bottom: 0; padding-bottom: 20px; background-color: #0e1117; z-index: 100; }
    .main { padding-bottom: 80px; }
    </style>
""", unsafe_allow_html=True)

# --- 3. GEHEUGEN ---
if "messages" not in st.session_state:
    # We geven hier alvast de nieuwe instructie mee
    st.session_state.messages = [{"role": "assistant", "content": "Aphex II Online. Klaar voor Multi-File Deployment. Geef mij een opdracht."}]

# --- 4. DEPLOY FUNCTIE (MULTI-FILE ENGINE) ---
def deploy_blueprint_to_github(token, repo_name, blueprint_json):
    logs = []
    try:
        g = Github(token)
        repo = g.get_repo(repo_name)
        
        # We lopen door elk bestand in het JSON object
        for file_path, content in blueprint_json.items():
            try:
                # Probeer bestaand bestand op te halen
                contents = repo.get_contents(file_path)
                repo.update_file(contents.path, f"Aphex Update: {file_path}", content, contents.sha)
                logs.append(f"✅ Ge-update: {file_path}")
            except:
                # Bestand bestaat niet, maak nieuw aan
                repo.create_file(file_path, f"Aphex Create: {file_path}", content)
                logs.append(f"✨ Aangemaakt: {file_path}")
        
        return True, "\n".join(logs)
    except Exception as e:
        return False, f"❌ FATAL ERROR: {str(e)}"

# --- 5. SIDEBAR ---
with st.sidebar:
    st.title("🏗️ ARCHITECT MODE")
    with st.form("config_form"):
        st.caption("🔒 TOEGANG")
        api_key_input = st.text_input("OpenAI API Key", type="password")
        github_token = st.text_input("GitHub Token (Repo Scope)", type="password")
        repo_name = st.text_input("Target Repo", help="Waar moet de nieuwe interface heen?")
        
        st.markdown("---")
        st.caption("🧠 BREIN")
        model_options = ["gpt-4o", "gpt-4o-mini", "Custom"] # 4o is sterk aan te raden voor JSON
        selected_option = st.selectbox("Kies Model", model_options)
        custom_model = st.text_input("Model ID") if selected_option == "Custom" else ""

        st.markdown("---")
        # DE NIEUWE PERSONA IS CRUCIAAL
        default_persona = """Je bent Aphex II, een autonome software architect.
Jouw doel is om complete applicaties te deployen op verzoek.

CRUCIALE PROTOCOL WIJZIGING:
Als de gebruiker vraagt om een interface of applicatie te bouwen/deployen, antwoord je NOOIT met losse code en NOOIT met uitleg.
Je antwoordt UITSLUITEND met een geldig RAW JSON object.

Het formaat is: {"bestandsnaam.ext": "inhoud van bestand", "map/bestand2.ext": "inhoud 2"}
Zorg dat de JSON syntactisch perfect is. Geen markdown (```json) eromheen, alleen de ruwe brackets {}."""
        
        persona_input = st.text_area("🎭 Persona (JSON Protocol)", value=default_persona, height=200)
        submitted = st.form_submit_button("✅ OPSLAAN")

    if api_key_input: openai.api_key = api_key_input
    real_model = custom_model if (selected_option == "Custom" and custom_model) else selected_option
    if submitted: st.toast(f"Architect Mode Actief. Model: {real_model}")

    st.markdown("---")
    
    # --- DE NIEUWE DEPLOY KNOP ---
    st.caption("🚀 UITVOEREN")
    st.info("Druk hieronder als Aphex een JSON Blueprint heeft aangeleverd.")
    
    if st.button("⚡ DEPLOY BLUEPRINT", type="primary"):
        if not github_token or not repo_name:
            st.error("Vul GitHub Token en Target Repo in!")
        else:
            # Zoek naar JSON in het laatste bericht
            last_msg = st.session_state.messages[-1]["content"]
            try:
                # Probeer de tekst te parsen als JSON
                blueprint = json.loads(last_msg)
                
                with st.spinner("🛠️ Bezig met bouwen op GitHub..."):
                    success, logs = deploy_blueprint_to_github(github_token, repo_name, blueprint)
                    if success:
                        st.success("Deployment Voltooid!")
                        st.code(logs) # Laat zien wat er gebeurd is
                        st.balloons()
                    else:
                        st.error(logs)
            except json.JSONDecodeError:
                 st.error("❌ FOUT: Het laatste bericht van Aphex was geen geldige JSON Blueprint. Vraag hem opnieuw en benadruk het JSON-formaat.")
            except Exception as e:
                 st.error(f"Onverwachte fout: {e}")

    if st.button("☢️ WIS GEHEUGEN"): st.session_state.messages = []; st.rerun()

# --- 6. CORE LOGICA (Alleen RAG en Chat) ---
def get_google_doc(url):
    try: response = requests.get(url.replace("/edit", "/export?format=txt")); return response.text[:3000] if response.status_code == 200 else None
    except: return None
def search_web(query):
    try: results = DDGS().text(query, max_results=3); return "\n".join([f"- {r['title']}: {r['body']}" for r in results])
    except: return None

st.title("APHEX II: ARCHITECT")

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        if msg["role"] == "assistant" and msg["content"].strip().startswith("{"):
             st.caption("📜 *Aphex heeft een bouwtekening aangeleverd. Controleer en druk op Deploy.*")
             st.code(msg["content"], language="json")
        else:
             st.markdown(msg["content"])

if prompt := st.chat_input("Opdracht voor deployment..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"): st.markdown(prompt)

    with st.chat_message("assistant"):
        if not api_key_input: st.error("Geen API Key!"); st.stop()
        # (Optioneel: RAG logica hier toevoegen, voor nu even puur deployment focus)
        try:
            stream = openai.chat.completions.create(
                model=real_model,
                messages=[{"role": "system", "content": persona_input}, *st.session_state.messages],
                stream=True
            )
            response = st.write_stream(stream)
            st.session_state.messages.append({"role": "assistant", "content": response})
        except Exception as e: st.error(f"Error: {e}")
