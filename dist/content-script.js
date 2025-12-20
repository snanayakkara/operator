const x="2.7.0-xestro-dark-mode";console.log("🏥 Operator Chrome Extension Content Script Loading...",window.location.href);console.log("📝 Content Script Version:",x);console.log("⏰ Load Time:",new Date().toISOString());console.log("🔧 EXTRACT_EMR_DATA handler: ENABLED");console.log("🔧 AI Review support: ENABLED");if(window.operatorContentScriptLoaded)console.log("🏥 Content script already loaded, skipping..."),console.log("📝 Previously loaded version:",window.operatorContentScriptVersion||"unknown");else{window.operatorContentScriptLoaded=!0,window.operatorContentScriptVersion=x;class w{isInitialized=!1;emrSystem=null;currentTabId=null;blockGlobalFileDrop=!1;pathologyOverlayObserver=null;saveAndSendRunning=!1;darkModeStyleElement=null;darkModeEnabled=!1;pendingIframeDarkModeRefresh=null;constructor(){this.initialize()}async initialize(){if(!this.isInitialized)try{this.emrSystem=this.detectEMRSystem(),this.emrSystem?(console.log(`🏥 Operator Chrome Extension: Detected ${this.emrSystem.name}`),this.setupEventListeners(),this.setupPathologyOverlayWatcher(),this.applyPersistedDarkModePreference(),this.isInitialized=!0,console.log("🏥 Content script initialized successfully")):console.log("🏥 EMR system not detected on this page:",window.location.href)}catch(e){console.error("Content script initialization failed:",e)}}detectEMRSystem(){return window.location.hostname.includes("my.xestro.com")?{name:"Xestro",baseUrl:"https://my.xestro.com",fields:{investigationSummary:{selector:'textarea[data-field="investigation-summary"], #investigation-summary, .investigation-summary textarea, #AddNoteArea',type:"textarea",label:"Investigation Summary",waitFor:'.XestroBoxTitle:contains("Investigation Summary")'},background:{selector:'textarea[data-field="background"], #background, .background textarea',type:"textarea",label:"Background",waitFor:'.XestroBoxTitle:contains("Background")'},medications:{selector:'textarea[data-field="medications"], #medications, .medications textarea',type:"textarea",label:"Medications"},notes:{selector:'textarea[data-field="notes"], #notes, .notes textarea, #AddNoteArea',type:"textarea",label:"Notes"},testsRequested:{selector:'.TestsRequested input[type="text"], .tests-requested-tagit input[type="text"], ul.TestsRequested li.tagit-new input',type:"input",label:"Tests Requested"},labField:{selector:"ul li input.ui-widget-content.ui-autocomplete-input, li.tagit-new input.ui-widget-content.ui-autocomplete-input, .ui-widget-content.ui-autocomplete-input:not(.PatientName):not(#PatientName), #Lab.form-control.LabForm.ui-autocomplete-input",type:"input",label:"Lab Autocomplete Field"}},selectors:{patientRecord:".patient-record, .record-view, #patient-view",noteArea:'#AddNoteArea, .note-area, textarea[placeholder*="note"]',quickLetter:'.quick-letter, .QuickLetter, [data-action="quick-letter"]',taskButton:'.task-button, [data-action="create-task"]'}}:null}setupEventListeners(){chrome.runtime.onMessage.addListener((o,n,a)=>{if(o?.type==="OPEN_CAMERA_OVERLAY"||o?.type==="OPEN_CANVAS_OVERLAY"){const i=typeof o.targetSlot=="number"?o.targetSlot:0;return this.openCameraOverlay(i),a?.({ok:!0}),!0}return!1}),chrome.runtime.onMessage.addListener((o,n,a)=>(this.handleMessage(o,n,a),!0)),document.addEventListener("keydown",o=>{this.handleKeyboardShortcut(o)});const e=o=>{if(this.blockGlobalFileDrop)return o.preventDefault(),o.stopPropagation(),!1};window.addEventListener("dragover",e,!0),window.addEventListener("drop",e,!0),new MutationObserver(o=>{this.handleDOMChanges(o)}).observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["class","id"]}),window.addEventListener("hashchange",()=>{this.autoSearchFromHash()}),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{this.autoSearchFromHash()}):this.autoSearchFromHash()}cameraOverlay=null;async openCameraOverlay(e){try{this.destroyCameraOverlay();const t=document.createElement("div");t.style.position="fixed",t.style.inset="0",t.style.background="rgba(0,0,0,0.6)",t.style.backdropFilter="blur(4px)",t.style.zIndex="2147483647",t.style.display="flex",t.style.alignItems="center",t.style.justifyContent="center",t.style.fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';const o=document.createElement("div");o.style.width="min(960px, 92vw)",o.style.maxWidth="960px",o.style.background="#fff",o.style.borderRadius="24px",o.style.boxShadow="0 20px 60px rgba(0,0,0,0.2)",o.style.overflow="hidden",o.style.display="flex",o.style.flexDirection="column";const n=document.createElement("div");n.style.display="flex",n.style.justifyContent="space-between",n.style.alignItems="center",n.style.padding="16px 20px",n.style.borderBottom="1px solid #e5e7eb";const a=document.createElement("div"),i=document.createElement("div");i.textContent=`Use Camera (Slot ${e+1})`,i.style.fontSize="18px",i.style.fontWeight="700",i.style.color="#111827";const r=document.createElement("div");r.textContent="Continuity Camera works when this page is foregrounded",r.style.fontSize="13px",r.style.color="#6b7280",r.style.marginTop="4px",a.appendChild(i),a.appendChild(r);const s=document.createElement("button");s.textContent="✕",s.style.border="none",s.style.background="transparent",s.style.cursor="pointer",s.style.fontSize="18px",s.style.color="#6b7280",s.onclick=()=>this.destroyCameraOverlay(),n.appendChild(a),n.appendChild(s);const c=document.createElement("div");c.style.padding="16px 20px",c.style.display="grid",c.style.gap="12px";const l=document.createElement("div"),d=document.createElement("label");d.textContent="Camera source",d.style.fontSize="14px",d.style.fontWeight="600",d.style.color="#111827",d.style.display="block",d.style.marginBottom="4px",d.setAttribute("for","operator-camera-select");const u=document.createElement("div");u.style.display="flex",u.style.alignItems="center",u.style.gap="8px";const m=document.createElement("select");m.id="operator-camera-select",m.style.width="100%",m.style.padding="10px 12px",m.style.border="1px solid #d1d5db",m.style.borderRadius="10px",m.style.fontSize="14px",m.style.color="#111827",m.style.background="#fff",m.style.outline="none",m.onchange=()=>this.startCamera(m.value);const p=document.createElement("button");p.textContent="Refresh",p.style.padding="10px 12px",p.style.border="1px solid #d1d5db",p.style.borderRadius="10px",p.style.background="#fff",p.style.cursor="pointer",p.onclick=()=>this.enumerateAndStart(m),u.appendChild(m),u.appendChild(p),l.appendChild(d),l.appendChild(u);const f=document.createElement("div");f.textContent="Unlock your iPhone, keep Wi‑Fi & Bluetooth on, then click Refresh if “iPhone Camera” is missing.",f.style.fontSize="12px",f.style.color="#6b7280";const g=document.createElement("video");g.autoplay=!0,g.playsInline=!0,g.muted=!0,g.style.width="100%",g.style.aspectRatio="16 / 9",g.style.background="#000",g.style.borderRadius="16px",g.style.objectFit="cover";const h=document.createElement("div");h.style.display="flex",h.style.justifyContent="flex-end",h.style.gap="10px",h.style.paddingTop="8px";const y=document.createElement("button");y.textContent="Cancel",y.style.padding="10px 16px",y.style.border="1px solid #d1d5db",y.style.borderRadius="10px",y.style.background="#fff",y.style.cursor="pointer",y.onclick=()=>this.destroyCameraOverlay();const b=document.createElement("button");b.textContent="Capture",b.style.padding="10px 16px",b.style.border="none",b.style.borderRadius="10px",b.style.background="linear-gradient(135deg, #6366f1, #8b5cf6)",b.style.color="#fff",b.style.cursor="pointer",b.onclick=()=>this.captureFrame(e),h.appendChild(y),h.appendChild(b),c.appendChild(l),c.appendChild(f),c.appendChild(g),c.appendChild(h),o.appendChild(n),o.appendChild(c),t.appendChild(o),document.body.appendChild(t),this.cameraOverlay={container:t,video:g,stream:null,deviceSelect:m,refreshButton:p,targetSlot:e},await this.enumerateAndStart(m)}catch(t){console.error("Failed to open camera overlay:",t)}}async enumerateAndStart(e){try{let t=null;try{t=await navigator.mediaDevices.getUserMedia({video:!0,audio:!1})}catch(i){console.warn("Camera permission request failed before enumerate:",i)}finally{t&&t.getTracks().forEach(i=>i.stop())}const n=(await navigator.mediaDevices.enumerateDevices()).filter(i=>i.kind==="videoinput");e.innerHTML="",n.forEach((i,r)=>{const s=document.createElement("option");s.value=i.deviceId,s.textContent=i.label||`Camera ${r+1}`,e.appendChild(s)});const a=n.find(i=>i.label.toLowerCase().includes("iphone"))||n.find(i=>i.label.toLowerCase().includes("continuity"))||n[0];a&&(e.value=a.deviceId,await this.startCamera(a.deviceId))}catch(t){console.error("Failed to enumerate cameras:",t)}}async startCamera(e){if(this.cameraOverlay)try{this.cameraOverlay.stream&&this.cameraOverlay.stream.getTracks().forEach(o=>o.stop());const t=await navigator.mediaDevices.getUserMedia({video:e?{deviceId:{exact:e}}:!0,audio:!1});this.cameraOverlay.video.srcObject=t,this.cameraOverlay.stream=t}catch(t){console.error("Failed to start camera:",t)}}captureFrame(e){if(!this.cameraOverlay?.video)return;const t=this.cameraOverlay.video,{videoWidth:o,videoHeight:n}=t;if(!o||!n)return;const a=Math.min(o,n),i=(o-a)/2,r=(n-a)/2,s=document.createElement("canvas");s.width=1024,s.height=1024;const c=s.getContext("2d");if(!c)return;c.drawImage(t,i,r,a,a,0,0,1024,1024);const l=s.toDataURL("image/png");chrome.runtime.sendMessage({type:"CAMERA_OVERLAY_RESULT",payload:{slot:e,dataUrl:l,width:1024,height:1024}}),this.destroyCameraOverlay()}destroyCameraOverlay(){this.cameraOverlay?.stream&&this.cameraOverlay.stream.getTracks().forEach(e=>e.stop()),this.cameraOverlay?.container&&this.cameraOverlay.container.remove(),this.cameraOverlay=null}async handleMessage(e,t,o){console.log("🏥 Content script received message:",e),console.log("📝 Content script version:",x,"at",new Date().toISOString()),console.log("🔧 Available message types: EXTRACT_EMR_DATA, EXECUTE_ACTION, SHOW_SCREENSHOT_INSTRUCTIONS, START_CLIPBOARD_MONITORING");try{const{type:n,action:a,data:i}=e;if(console.log("📨 Processing message type:",n,"action:",a),n==="PING"){o({success:!0,ready:!0,version:x});return}if(n==="SET_FILE_DROP_GUARD"){this.blockGlobalFileDrop=!!e.enabled,console.log("🛡️ File drop guard set to",this.blockGlobalFileDrop),o({success:!0,enabled:this.blockGlobalFileDrop});return}if(n==="PAGE_STATUS_CHECK"){try{const r=this.getPageStatus();o({success:!0,status:r})}catch(r){o({success:!1,error:r instanceof Error?r.message:"Page status check failed"})}return}if(n==="CHECK_XESTRO_BOXES"){try{const r=document.querySelectorAll(".XestroBox").length,s=r>0;console.log(`📋 XestroBox check: found ${r} boxes, hasPatientData: ${s}`),o({success:!0,found:s,count:r,url:window.location.href})}catch(r){o({success:!1,error:r instanceof Error?r.message:"XestroBox check failed"})}return}if(n==="SHOW_SCREENSHOT_INSTRUCTIONS"){await this.showScreenshotInstructions(i),o({success:!0});return}if(n==="CLOSE_SCREENSHOT_INSTRUCTIONS"){this.closeScreenshotModal(),o({success:!0});return}if(n==="START_CLIPBOARD_MONITORING"){console.log("📸 Content script received START_CLIPBOARD_MONITORING request"),this.startClipboardMonitoring(i.timeoutMs||3e4),o({success:!0});return}if(n==="EXTRACT_EMR_DATA"){console.log("📋 Received EXTRACT_EMR_DATA request - HANDLER FOUND!"),console.log("📋 Request data:",i),console.log("📋 Extracting fields:",i?.fields||["background","investigations","medications"]);try{const r=await this.extractEMRData(i?.fields||["background","investigations","medications"]);console.log("📋 EMR extraction completed successfully:",r),o({success:!0,data:r})}catch(r){console.error("📋 EMR extraction failed:",r),o({success:!1,error:r instanceof Error?r.message:"EMR extraction failed"})}return}if(n==="EXTRACT_EMR_DATA_AI_REVIEW"){console.log("🤖 Received EXTRACT_EMR_DATA_AI_REVIEW request - NON-INVASIVE EXTRACTION"),console.log("🤖 Request data:",i),console.log("🤖 Extracting fields (non-invasive):",i?.fields||["background","investigations","medications-problemlist"]);try{const r=await this.extractEMRDataForAIReview(i?.fields||["background","investigations","medications-problemlist"]);console.log("🤖 AI Review EMR extraction completed successfully:",r),o({success:!0,data:r})}catch(r){console.error("🤖 AI Review EMR extraction failed:",r),o({success:!1,error:r instanceof Error?r.message:"AI Review EMR extraction failed"})}return}if(n==="EXTRACT_PATIENT_DATA"){console.log("👤 Received EXTRACT_PATIENT_DATA request");try{const r=this.extractPatientData();console.log("👤 Patient data extraction completed:",r),o({success:!0,data:r})}catch(r){console.error("👤 Patient data extraction failed:",r),o({success:!1,error:r instanceof Error?r.message:"Patient data extraction failed"})}return}if(n==="EXTRACT_CUSTOM_NOTE_CONTENT"){console.log("📋 Received EXTRACT_CUSTOM_NOTE_CONTENT request for field:",e.fieldName);try{const r=await this.extractCustomNoteContent(e.fieldName);console.log(`📋 Custom note extraction completed for "${e.fieldName}": ${r.length} chars`),o({success:!0,data:r})}catch(r){console.error(`📋 Custom note extraction failed for "${e.fieldName}":`,r),o({success:!1,error:r instanceof Error?r.message:"Custom note extraction failed"})}return}if(n==="extract-calendar-patients"){console.log("📅 Received extract-calendar-patients request");try{const r=await this.extractCalendarPatients();console.log("📅 Calendar patient extraction completed:",r),o({success:!0,data:r})}catch(r){console.error("📅 Calendar patient extraction failed:",r),o({success:!1,error:r instanceof Error?r.message:"Calendar extraction failed"})}return}if(n!=="EXECUTE_ACTION"){console.log("❌ Unknown message type:",n),o({error:"Unknown message type"});return}switch(console.log(`🏥 Executing action: ${a}`),a){case"insertText":await this.insertText(i.text,i.fieldType),o({success:!0});break;case"openField":await this.openFieldByType(i.fieldType),o({success:!0});break;case"investigation-summary":if(i?.extractOnly){const r=await this.extractFieldContent("Investigation Summary");o({success:!0,data:r})}else if(i?.insertMode==="append"&&i?.content){console.log("📝 Investigation Summary: Opening field and appending content"),await this.openInvestigationSummary(),await this.wait(500);const r=await this.findNoteArea();if(r)await this.insertTextAtEndOfField(r,i.content),console.log("✅ Content appended to Investigation Summary field");else throw console.error("❌ Could not find note area for appending"),new Error("Note area not found for content insertion");o({success:!0})}else await this.openInvestigationSummary(),i?.content&&(await this.wait(500),await this.insertFormattedSummary(i.content)),o({success:!0});break;case"background":if(i?.extractOnly){const r=await this.extractFieldContent("Background");o({success:!0,data:r})}else if(i?.insertMode==="append"&&i?.content){console.log("📝 Background: Opening field and appending content"),await this.openBackground(),await this.wait(500);const r=await this.findNoteArea();if(r)await this.insertTextAtEndOfField(r,i.content),console.log("✅ Content appended to Background field");else throw console.error("❌ Could not find note area for appending"),new Error("Note area not found for content insertion");o({success:!0})}else await this.openBackground(),o({success:!0});break;case"medications":if(i?.extractOnly){const r=await this.extractFieldContent("Medications (Problem List for Phil)")||await this.extractFieldContent("Medications");o({success:!0,data:r})}else if(i?.insertMode==="append"&&i?.content){console.log("📝 Medications: Opening field and appending content"),await this.openMedications(),await this.wait(500);const r=await this.findNoteArea();if(r)await this.insertTextAtEndOfField(r,i.content),console.log("✅ Content appended to Medications field");else throw console.error("❌ Could not find note area for appending"),new Error("Note area not found for content insertion");o({success:!0})}else await this.openMedications(),o({success:!0});break;case"social-history":if(i?.insertMode==="append"&&i?.content){console.log("📝 Social History: Opening field and appending content"),await this.openSocialHistory(),await this.wait(500);const r=await this.findNoteArea();if(r)await this.insertTextAtEndOfField(r,i.content),console.log("✅ Content appended to Social History field");else throw console.error("❌ Could not find note area for appending"),new Error("Note area not found for content insertion");o({success:!0})}else await this.openSocialHistory(),o({success:!0});break;case"bloods":await this.clickPathologyButton(),await this.setupLabField(),o({success:!0});break;case"bloods-insert":await this.insertIntoLabField(i.content),o({success:!0});break;case"imaging":await this.clickRadiologyButton(),o({success:!0});break;case"message-patient":if(!i?.message||typeof i.message!="string")throw new Error("Message text is required for patient messaging");await this.openMessagingWithPrefill(typeof i.subject=="string"?i.subject:null,i.message),o({success:!0});break;case"extract-patient-data":{const r=this.extractPatientData();o(r?{success:!0,data:r}:{success:!1,error:"No patient data found"});break}case"quick-letter":await this.openQuickLetter(),o({success:!0});break;case"create-task":await this.createTask(),o({success:!0});break;case"appointment-wrap-up":await this.appointmentWrapUp(i),o({success:!0});break;case"profile-photo":await this.handleProfilePhoto(i),o({success:!0});break;case"xestro-dark-mode":{const r=this.toggleXestroDarkMode(typeof i?.force=="boolean"?i.force:void 0);o(r===null?{success:!1,error:"Dark mode is only available on my.xestro.com"}:{success:!0,enabled:r});break}case"save":await this.saveNote(),o({success:!0});break;case"ai-medical-review":console.warn("⚠️ AI medical review should be processed entirely in side panel"),o({success:!0,message:"AI medical review should use side panel processing only"});break;case"navigate-to-patient":console.log("🧭 Received navigate-to-patient request");try{await this.navigateToPatient(i.fileNumber,i.patientName),o({success:!0})}catch(r){console.error("🧭 Patient navigation failed:",r),o({success:!1,error:r instanceof Error?r.message:"Navigation failed"})}break;case"GO_TO_PATIENT_BY_FILING":console.log("🔍 Received GO_TO_PATIENT_BY_FILING request");try{await this.searchPatientByFiling(i.fileNumber),o({success:!0})}catch(r){console.error("🔍 Patient search by filing failed:",r),o({success:!1,error:r instanceof Error?r.message:"Search failed"})}break;case"activate-patient-by-element":console.log("🖱️ Received activate-patient-by-element request");try{await this.activatePatientByElement(i.patientSelector||i.patientIndex),o({success:!0})}catch(r){console.error("🖱️ Patient activation failed:",r),o({success:!1,error:r instanceof Error?r.message:"Patient activation failed"})}break;case"double-click-patient":console.log("👆 SWITCH CASE HIT: double-click-patient"),console.log("👆 Received double-click-patient request with data:",i),console.log("👆 About to call this.doubleClickPatient method...");try{await this.doubleClickPatient(i.patientName,i.patientId),console.log("👆 doubleClickPatient method completed successfully"),o({success:!0})}catch(r){console.error("👆 Double-click patient failed:",r),o({success:!1,error:r instanceof Error?r.message:"Double-click patient failed"})}break;case"navigate-to-patient-record":console.log("🏥 SWITCH CASE HIT: navigate-to-patient-record"),console.log("🏥 Received navigate-to-patient-record request"),console.log("🏥 About to call this.navigateToPatientRecord method...");try{await this.navigateToPatientRecord(),console.log("🏥 navigateToPatientRecord method completed successfully"),o({success:!0})}catch(r){console.error("🏥 Navigate to patient record failed:",r),o({success:!1,error:r instanceof Error?r.message:"Navigate to patient record failed"})}break;case"navigate-to-appointment-book":console.log("📅 Received navigate-to-appointment-book request");try{await this.navigateToAppointmentBook(),o({success:!0})}catch(r){console.error("📅 Navigate to appointment book failed:",r),o({success:!1,error:r instanceof Error?r.message:"Navigate to appointment book failed"})}break;case"extract-calendar-patients":console.log("📅 Received extract-calendar-patients request (via EXECUTE_ACTION)");try{const r=await this.extractCalendarPatients();console.log("📅 Calendar patient extraction completed:",r),o({success:!0,data:r})}catch(r){console.error("📅 Calendar patient extraction failed:",r),o({success:!1,error:r instanceof Error?r.message:"Calendar extraction failed"})}break;case"extract-patient-fields":console.log("📋 SWITCH CASE HIT: extract-patient-fields"),console.log("📋 Received extract-patient-fields request"),console.log("📋 About to call extractPatientFields method...");try{const r=await this.extractPatientFields();console.log("📋 extractPatientFields completed, sending response:",r),o({success:!0,data:r})}catch(r){console.error("📋 Extract patient fields failed:",r),o({success:!1,error:r instanceof Error?r.message:"Extract patient fields failed"})}break;default:console.log(`❌ DEFAULT CASE HIT: Unknown action "${a}"`),console.log("❌ Available SPA actions: double-click-patient, navigate-to-patient-record, extract-patient-fields"),o({error:"Unknown action"})}}catch(n){console.error("Content script message handling error:",n),o({error:n instanceof Error?n.message:"Unknown error"})}}getXestroDarkModeCssText(){return`
      /* Operator Xestro Dark Mode (Material-inspired) */
      html.operator-xestro-dark-mode {
        color-scheme: dark;

        /* Core palette (Material Dark Theme guidance: dark surfaces + high contrast text) */
        --operator-xestro-bg: #000000;
        --operator-xestro-surface-0: #121212;
        --operator-xestro-surface-1: #1e1e1e;
        --operator-xestro-surface-2: #2a2a2a;
        --operator-xestro-surface-3: #333333;

        --operator-xestro-text-primary: rgba(255, 255, 255, 0.87);
        --operator-xestro-text-secondary: rgba(255, 255, 255, 0.60);
        --operator-xestro-text-disabled: rgba(255, 255, 255, 0.38);

        --operator-xestro-border: rgba(255, 255, 255, 0.12);
        --operator-xestro-border-strong: rgba(255, 255, 255, 0.20);

        --operator-xestro-link: #8ab4f8;
        --operator-xestro-accent: #03dac6;
        --operator-xestro-danger: #cf6679;
        --operator-xestro-focus: rgba(138, 180, 248, 0.35);

        background: var(--operator-xestro-bg);
      }

      html.operator-xestro-dark-mode body {
        background: var(--operator-xestro-bg) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode a {
        color: var(--operator-xestro-link) !important;
      }

      html.operator-xestro-dark-mode ::selection {
        background: rgba(3, 218, 198, 0.25);
      }

      /* Xestro core surfaces */
      html.operator-xestro-dark-mode .XestroBox,
      html.operator-xestro-dark-mode .XestroBoxContent,
      html.operator-xestro-dark-mode .patient-record,
      html.operator-xestro-dark-mode .record-view,
      html.operator-xestro-dark-mode #patient-view {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .XestroBox {
        border: 1px solid var(--operator-xestro-border) !important;
        box-shadow: none !important;
      }

      html.operator-xestro-dark-mode .XestroBoxTitle,
      html.operator-xestro-dark-mode .XestroBoxHeader,
      html.operator-xestro-dark-mode .XestroHeader,
      html.operator-xestro-dark-mode .Header,
      html.operator-xestro-dark-mode header {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Common container fallbacks (Bootstrap-like patterns) */
      html.operator-xestro-dark-mode .panel,
      html.operator-xestro-dark-mode .panel-body,
      html.operator-xestro-dark-mode .panel-heading,
      html.operator-xestro-dark-mode .card,
      html.operator-xestro-dark-mode .card-body,
      html.operator-xestro-dark-mode .card-header,
      html.operator-xestro-dark-mode .modal-content,
      html.operator-xestro-dark-mode .dropdown-menu {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Document views and attachments */
      html.operator-xestro-dark-mode .documents,
      html.operator-xestro-dark-mode .documents-list,
      html.operator-xestro-dark-mode .document-item,
      html.operator-xestro-dark-mode .document-preview,
      html.operator-xestro-dark-mode .document-thumbnail,
      html.operator-xestro-dark-mode .attachment,
      html.operator-xestro-dark-mode .attachment-list,
      html.operator-xestro-dark-mode .attachment-item,
      html.operator-xestro-dark-mode .file-preview,
      html.operator-xestro-dark-mode .file-list,
      html.operator-xestro-dark-mode .preview-container,
      html.operator-xestro-dark-mode .thumbnail-container {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Sidebar panels and sections */
      html.operator-xestro-dark-mode .sidebar,
      html.operator-xestro-dark-mode .side-panel,
      html.operator-xestro-dark-mode .right-panel,
      html.operator-xestro-dark-mode .left-panel,
      html.operator-xestro-dark-mode .info-panel,
      html.operator-xestro-dark-mode .detail-panel,
      html.operator-xestro-dark-mode .patient-info,
      html.operator-xestro-dark-mode .patient-details,
      html.operator-xestro-dark-mode .summary-panel,
      html.operator-xestro-dark-mode .context-panel {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Section headers and titles */
      html.operator-xestro-dark-mode .section,
      html.operator-xestro-dark-mode .section-header,
      html.operator-xestro-dark-mode .section-title,
      html.operator-xestro-dark-mode .section-content,
      html.operator-xestro-dark-mode .section-body,
      html.operator-xestro-dark-mode .content-section,
      html.operator-xestro-dark-mode .box,
      html.operator-xestro-dark-mode .box-header,
      html.operator-xestro-dark-mode .box-body,
      html.operator-xestro-dark-mode .box-content {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Generic div containers with white backgrounds */
      html.operator-xestro-dark-mode .content,
      html.operator-xestro-dark-mode .main-content,
      html.operator-xestro-dark-mode .wrapper,
      html.operator-xestro-dark-mode .container-fluid,
      html.operator-xestro-dark-mode .inner,
      html.operator-xestro-dark-mode .inner-content,
      html.operator-xestro-dark-mode .view,
      html.operator-xestro-dark-mode .view-content {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      /* Lists and items */
      html.operator-xestro-dark-mode .list,
      html.operator-xestro-dark-mode .list-item,
      html.operator-xestro-dark-mode .item,
      html.operator-xestro-dark-mode .list-group,
      html.operator-xestro-dark-mode .list-group-item {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      /* Catch-all for common background colors inline styles */
      html.operator-xestro-dark-mode [style*="background-color: white"],
      html.operator-xestro-dark-mode [style*="background-color: #fff"],
      html.operator-xestro-dark-mode [style*="background-color: #ffffff"],
      html.operator-xestro-dark-mode [style*="background-color: rgb(255, 255, 255)"],
      html.operator-xestro-dark-mode [style*="background: white"],
      html.operator-xestro-dark-mode [style*="background: #fff"],
      html.operator-xestro-dark-mode [style*="background: #ffffff"] {
        background: var(--operator-xestro-surface-0) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      /* Form controls (scoped to likely Xestro containers to avoid theming Operator overlays) */
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="text"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="search"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="email"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="url"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="tel"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="password"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input[type="number"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) textarea,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) select,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) .form-control {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border-strong) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input::placeholder,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) textarea::placeholder {
        color: var(--operator-xestro-text-secondary) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) input:focus,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) textarea:focus,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) select:focus,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog,
        .ui-menu,
        .ui-datepicker
      ) .form-control:focus {
        border-color: rgba(138, 180, 248, 0.55) !important;
        box-shadow: 0 0 0 3px var(--operator-xestro-focus) !important;
        outline: none !important;
      }

      /* Buttons (scoped) */
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) button,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) input[type="button"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) input[type="submit"],
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) .btn {
        background: var(--operator-xestro-surface-2) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) .btn-primary,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) button.primary {
        background: rgba(3, 218, 198, 0.16) !important;
        border-color: rgba(3, 218, 198, 0.35) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) button:hover,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .dropdown-menu,
        .ui-widget-content,
        .ui-dialog
      ) .btn:hover {
        background: var(--operator-xestro-surface-3) !important;
      }

      /* jQuery UI (autocomplete/dialogs) */
      html.operator-xestro-dark-mode .ui-widget-content,
      html.operator-xestro-dark-mode .ui-dialog,
      html.operator-xestro-dark-mode .ui-dialog-content,
      html.operator-xestro-dark-mode .ui-menu,
      html.operator-xestro-dark-mode .ui-datepicker {
        background: var(--operator-xestro-surface-1) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .ui-widget-header,
      html.operator-xestro-dark-mode .ui-dialog-titlebar {
        background: var(--operator-xestro-surface-2) !important;
        color: var(--operator-xestro-text-primary) !important;
        border: 1px solid var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .ui-state-default,
      html.operator-xestro-dark-mode .ui-button,
      html.operator-xestro-dark-mode .ui-menu-item-wrapper {
        background: var(--operator-xestro-surface-2) !important;
        color: var(--operator-xestro-text-primary) !important;
        border-color: var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode .ui-state-hover,
      html.operator-xestro-dark-mode .ui-state-focus,
      html.operator-xestro-dark-mode .ui-menu-item-wrapper.ui-state-active {
        background: var(--operator-xestro-surface-3) !important;
        border-color: var(--operator-xestro-border-strong) !important;
      }

      html.operator-xestro-dark-mode .ui-state-active,
      html.operator-xestro-dark-mode .ui-state-highlight {
        background: rgba(3, 218, 198, 0.16) !important;
        border-color: rgba(3, 218, 198, 0.35) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      /* jQuery UI icon sprites are usually dark; invert them only */
      html.operator-xestro-dark-mode .ui-icon {
        filter: invert(1) hue-rotate(180deg) saturate(1.2);
      }

      /* Tag-it */
      html.operator-xestro-dark-mode ul.tagit {
        background: var(--operator-xestro-surface-1) !important;
        border: 1px solid var(--operator-xestro-border-strong) !important;
      }

      html.operator-xestro-dark-mode ul.tagit li.tagit-choice {
        background: rgba(138, 180, 248, 0.12) !important;
        border: 1px solid rgba(138, 180, 248, 0.35) !important;
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode ul.tagit li.tagit-choice .tagit-close {
        color: var(--operator-xestro-text-secondary) !important;
      }

      /* Tables (scoped) */
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) table {
        color: var(--operator-xestro-text-primary) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) th,
      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) td {
        border-color: var(--operator-xestro-border) !important;
      }

      html.operator-xestro-dark-mode :is(
        .XestroBox,
        .XestroBoxContent,
        .patient-record,
        .record-view,
        #patient-view,
        .panel,
        .card,
        .modal-content,
        .ui-widget-content,
        .ui-dialog
      ) tr:nth-child(even) td {
        background: rgba(255, 255, 255, 0.03) !important;
      }

      /* Scrollbars (WebKit) */
      html.operator-xestro-dark-mode ::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      html.operator-xestro-dark-mode ::-webkit-scrollbar-track {
        background: var(--operator-xestro-surface-0);
      }
      html.operator-xestro-dark-mode ::-webkit-scrollbar-thumb {
        background: var(--operator-xestro-surface-2);
        border-radius: 8px;
        border: 3px solid var(--operator-xestro-surface-0);
      }
      html.operator-xestro-dark-mode ::-webkit-scrollbar-thumb:hover {
        background: var(--operator-xestro-surface-3);
      }
    `}ensureDarkModeStyles(){if(this.darkModeStyleElement)return;const e=document.createElement("style");e.id="__operator_xestro_dark_mode__",e.textContent=this.getXestroDarkModeCssText(),(document.head||document.documentElement).appendChild(e),this.darkModeStyleElement=e}ensureDarkModeStylesInDocument(e){if(e.getElementById("__operator_xestro_dark_mode__"))return;const t=e.createElement("style");t.id="__operator_xestro_dark_mode__",t.textContent=this.getXestroDarkModeCssText(),(e.head||e.documentElement).appendChild(t)}applyXestroDarkModeToSameOriginIframes(e){if(!this.emrSystem||this.emrSystem.name!=="Xestro")return;const t=Array.from(document.querySelectorAll("iframe"));for(const o of t)try{const n=o.contentDocument;if(!n?.documentElement)continue;this.ensureDarkModeStylesInDocument(n),n.documentElement.classList.toggle("operator-xestro-dark-mode",e)}catch{}}toggleXestroDarkMode(e){if(!this.emrSystem||this.emrSystem.name!=="Xestro")return console.warn("🌙 Dark mode toggle ignored: Xestro EMR not detected"),null;this.ensureDarkModeStyles();const t=this.darkModeEnabled||document.documentElement.classList.contains("operator-xestro-dark-mode"),o=typeof e=="boolean"?e:!t;document.documentElement.classList.toggle("operator-xestro-dark-mode",o),this.darkModeEnabled=o,this.applyXestroDarkModeToSameOriginIframes(o);try{localStorage.setItem("operator-xestro-dark-mode",o?"true":"false")}catch(n){console.debug("Unable to persist dark mode preference:",n)}return console.log(`🌙 Xestro dark mode ${o?"enabled":"disabled"}`),o}applyPersistedDarkModePreference(){if(!(!this.emrSystem||this.emrSystem.name!=="Xestro"))try{localStorage.getItem("operator-xestro-dark-mode")==="true"&&(console.log("🌙 Restoring Xestro dark mode from previous session"),this.toggleXestroDarkMode(!0))}catch(e){console.debug("Skipping dark mode restore:",e)}}handleKeyboardShortcut(e){if(!(!(e.ctrlKey||e.metaKey)||!e.shiftKey))switch(e.key.toLowerCase()){case"i":e.preventDefault(),this.openInvestigationSummary();break;case"b":e.preventDefault(),this.openBackground();break;case"m":e.preventDefault(),this.openMedications();break;case"s":e.preventDefault(),this.openSocialHistory();break;case"l":e.preventDefault(),this.openQuickLetter();break;case"t":e.preventDefault(),this.createTask();break}}handleDOMChanges(e){let t=!1;for(const o of e)o.type==="childList"&&o.addedNodes.forEach(n=>{if(n.nodeType===Node.ELEMENT_NODE){const a=n;a.matches?.(".note-area, textarea, .field-container")&&this.updateFieldMappings(),!t&&(a.matches?.("iframe")||a.querySelector?.("iframe"))&&(t=!0)}});t&&this.darkModeEnabled&&this.emrSystem?.name==="Xestro"&&(this.pendingIframeDarkModeRefresh&&window.clearTimeout(this.pendingIframeDarkModeRefresh),this.pendingIframeDarkModeRefresh=window.setTimeout(()=>{this.pendingIframeDarkModeRefresh=null,this.applyXestroDarkModeToSameOriginIframes(!0)},250))}async insertText(e,t){let o=null;if(t&&this.emrSystem?.fields[t]?t==="investigationSummary"||t==="investigation-summary"?(console.log("📝 Special handling for Investigation Summary insertion - waiting for AddNoteArea"),o=await this.findElement("#AddNoteArea",3e3),o?console.log("✅ Found AddNoteArea for Investigation Summary insertion"):(console.log("⚠️ AddNoteArea not found, falling back to Investigation Summary textarea"),o=await this.findElement(this.emrSystem.fields[t].selector))):o=await this.findElement(this.emrSystem.fields[t].selector):(o=document.activeElement,this.isTextInputElement(o)||(o=await this.findActiveNoteArea())),!o)throw new Error("No suitable text input found");await this.insertTextIntoElement(o,e)}async openFieldByType(e){switch(console.log(`📝 Opening EMR field by type: ${e}`),e){case"investigationSummary":case"investigation-summary":console.log("📝 Using openInvestigationSummary() for field opening"),await this.openInvestigationSummary();break;case"background":console.log("📝 Using openBackground() for field opening"),await this.openBackground();break;case"medications":console.log("📝 Using openMedications() for field opening"),await this.openMedications();break;default:if(console.log(`📝 Using fallback field opening for: ${e}`),!this.emrSystem?.fields[e])throw new Error(`Unknown field type: ${e}`);{const t=this.emrSystem.fields[e],o=await this.findElement(t.selector,5e3);if(o)this.focusElement(o);else throw new Error(`Field ${e} not found`)}break}console.log(`✅ Field ${e} opened successfully`)}async insertTextIntoElement(e,t){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){const o=e,n=o.selectionStart||0,a=o.selectionEnd||0,i=o.value,r=i.slice(0,n)+t+i.slice(a);o.value=r;const s=n+t.length;o.setSelectionRange(s,s),o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0}))}else if(e.contentEditable==="true"){const o=window.getSelection();if(o&&o.rangeCount>0){const n=o.getRangeAt(0);n.deleteContents(),n.insertNode(document.createTextNode(t)),n.collapse(!1),o.removeAllRanges(),o.addRange(n)}else e.textContent+=t;e.dispatchEvent(new Event("input",{bubbles:!0}))}e.focus()}async insertFormattedSummary(e){console.log("📝 Inserting formatted investigation summary:",e);try{const t=await this.findInvestigationSummaryTextarea();if(!t){console.error("❌ No Investigation Summary textarea (AddNoteArea) found");return}await this.insertTextAtEndOfField(t,e),console.log("✅ Successfully inserted formatted investigation summary")}catch(t){console.error("❌ Error inserting formatted summary:",t)}}async findInvestigationSummaryTextarea(){console.log("🔍 Looking for Investigation Summary textarea...");const e=['.XestroBox:has(.XestroBoxTitle:contains("Investigation Summary")) textarea','.XestroBox:has(.XestroBoxTitle:contains("Investigation Summary")) .AddNoteArea','[data-field="investigation-summary"] textarea',"#investigation-summary textarea",".investigation-summary textarea"];for(const o of e){console.log(`🔍 Trying Investigation Summary specific selector: ${o}`);const n=await this.findElement(o,2e3);if(n&&n.tagName==="TEXTAREA")return console.log(`✅ Found Investigation Summary specific textarea with selector: ${o}`),n}const t=["textarea#AddNoteArea:focus","textarea.AddNoteArea:focus","textarea#AddNoteArea","textarea.AddNoteArea",'textarea[placeholder*="Add a note"]',"textarea.form-control.AddNoteArea"];for(const o of t){console.log(`🔍 Trying generic selector: ${o}`);const n=await this.findElement(o,1e3);if(n&&n.tagName==="TEXTAREA"){const a=n.getBoundingClientRect(),i=a.top>=0&&a.left>=0&&a.bottom<=window.innerHeight&&a.right<=window.innerWidth,r=a.top<window.innerHeight*.8;if(i&&r)return console.log(`✅ Found suitable Investigation Summary textarea with selector: ${o}`),n;console.log(`⚠️ Found textarea but it appears to be at bottom of page, skipping: ${o}`)}}return console.warn("⚠️ Could not find suitable Investigation Summary textarea with any selector"),null}async insertTextAtEndOfField(e,t){if(e.tagName==="TEXTAREA"||e.tagName==="INPUT"){const o=e;console.log("📝 Inserting into input/textarea:",{id:o.id,className:o.className,length:o.value?.length||0});const n=o.value;let a=t;n.trim().length>0&&(a=`
`+t);const i=n.length;o.setSelectionRange(i,i);const r=n+a;o.value=r;const s=r.length;o.setSelectionRange(s,s),o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0})),o.focus(),e.tagName==="TEXTAREA"&&(o.scrollTop=o.scrollHeight),console.log(`📝 Inserted text at end of field. Field now has ${r.length} characters.`)}else if(e.contentEditable==="true"){console.log("📝 Inserting into contenteditable element:",{id:e.id,className:e.className}),e.focus();const o=window.getSelection(),n=document.createRange();n.selectNodeContents(e),n.collapse(!1),o?.removeAllRanges(),o?.addRange(n);const a=e.textContent||"";let i=t;a.trim().length>0&&(i=`
`+t),n.insertNode(document.createTextNode(i)),n.collapse(!1),o?.removeAllRanges(),o?.addRange(n),e.dispatchEvent(new Event("input",{bubbles:!0})),e.focus()}console.log("✅ Text inserted at end of field and field kept focused for review")}async openInvestigationSummary(){console.log("📝 Opening Investigation Summary section in Xestro"),await this.openCustomField("Investigation Summary")}async openCustomFieldWithTemplate(e,t){console.log(`📝 Opening ${e} with template in note area`);const o=await this.findNoteArea();if(!o)throw console.error("❌ No suitable note area found on page"),new Error("Note area not found");o.focus();const n=t(),a=o.contentEditable==="true",i=a?o.innerText||"":o.value||"",r=n.split(`
`)[0];if(!i.includes(r)){const s=`${n}
${i}`;if(a)o.innerText=s,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0}));else{const c=o;c.value=s,c.dispatchEvent(new Event("input",{bubbles:!0})),c.dispatchEvent(new Event("change",{bubbles:!0}))}}o.style.boxShadow="0 0 5px 2px rgba(33, 150, 243, 0.5)",setTimeout(()=>{o.style.boxShadow=""},1e3),o.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{const s=document.querySelector("#patientNotesSave");s&&confirm("Save the updated notes?")&&(s.click(),console.log("💾 Auto-saved via Xestro save button"))},1e3),console.log("✅ Note area ready for input with template (Xestro method)")}async findNoteArea(){console.log("🔍 Looking for Xestro note input areas...");const e=document.getElementById("AddNoteArea");if(e&&e.offsetParent!==null)return console.log("✅ Using AddNoteArea textarea as note area"),e;const t=["#patientNotesInput","#patientNoteInput",".patient-notes-input",'[contenteditable="true"]'];for(const a of t){const i=document.querySelector(a);if(i&&i.offsetParent!==null)return console.log(`✅ Found Xestro note area with selector: ${a}`),i}const o=document.querySelectorAll('[contenteditable="true"], [contenteditable]');console.log(`🔍 Found ${o.length} contenteditable elements:`),o.forEach((a,i)=>{console.log(`  ${i+1}. ID: "${a.id}" Class: "${a.className}" Size: ${a.offsetWidth}x${a.offsetHeight}`)});const n=document.querySelectorAll("textarea");console.log(`🔍 Found ${n.length} textareas:`),n.forEach((a,i)=>{console.log(`  ${i+1}. ID: "${a.id}" Class: "${a.className}" Placeholder: "${a.placeholder}"`)});for(let a=0;a<o.length;a++){const i=o[a];if(i.offsetParent!==null&&i.offsetWidth>50&&i.offsetHeight>30)return console.log(`✅ Found usable contenteditable at index ${a+1}`),i}for(let a=0;a<n.length;a++){const i=n[a];if(i.offsetParent!==null&&!i.readOnly&&!i.disabled&&i.offsetWidth>50&&i.offsetHeight>30)return console.log(`✅ Found usable textarea at index ${a+1}${i.id?` (id: ${i.id})`:""}`),i}return console.log("⏳ No textarea found immediately, waiting for dynamic content..."),new Promise(a=>{const i=()=>{l&&clearTimeout(l),s&&s.disconnect()},r=()=>{const d=document.getElementById("AddNoteArea");if(d&&d.offsetParent!==null){console.log("✅ Found AddNoteArea dynamically"),i(),a(d);return}for(const m of t){const p=document.querySelector(m);if(p&&p.offsetParent!==null){console.log(`✅ Found note area dynamically with selector: ${m}`),i(),a(p);return}}const u=document.querySelectorAll("textarea");for(let m=0;m<u.length;m++){const p=u[m];if(p.offsetParent!==null&&!p.readOnly&&!p.disabled&&p.offsetWidth>50&&p.offsetHeight>30){console.log(`✅ Found usable textarea dynamically at index ${m+1}`),i(),a(p);return}}},s=new MutationObserver(d=>{let u=!1;d.forEach(m=>{m.type==="childList"&&m.addedNodes.forEach(p=>{if(p.nodeType===Node.ELEMENT_NODE){const f=p;(f.tagName==="TEXTAREA"||f.querySelector("textarea"))&&(u=!0)}})}),u&&r()});s.observe(document.body,{childList:!0,subtree:!0});const c=setInterval(r,500),l=setTimeout(()=>{i(),clearInterval(c),console.log("❌ Timeout waiting for textarea"),a(null)},1e4);r()})}async openCustomField(e){if(console.log(`📝 Opening ${e} section in Xestro`),!await this.findAndClickXestroBox(e))throw console.error(`❌ Could not find XestroBox for ${e}`),new Error(`XestroBox for ${e} not found`);console.log("⏳ Waiting for AddNoteArea textarea to appear...");const o=await this.waitForAddNoteArea();if(!o)throw console.error("❌ AddNoteArea textarea did not appear after clicking XestroBox"),new Error("AddNoteArea textarea not found");o.focus(),console.log(`✅ Found AddNoteArea textarea for ${e}`);const a=(o.value||"").length;o.setSelectionRange(a,a),o.dispatchEvent(new Event("focus",{bubbles:!0})),o.style.boxShadow="0 0 5px 2px rgba(33, 150, 243, 0.5)",setTimeout(()=>{o.style.boxShadow=""},1e3),o.scrollIntoView({behavior:"smooth",block:"center"}),console.log(`✅ ${e} section opened and ready for input`)}async openBackground(){console.log("📝 Opening Background in note area"),await this.openCustomField("Background")}async openMedications(){console.log("📝 Opening Medications section in Xestro"),await this.openCustomField("Medications (Problem List for Phil)")}async openSocialHistory(){console.log("📝 Opening Social & Family History section in Xestro"),await this.openCustomField("Social & Family History")}async openPatientConversation(){const e=await this.findElement(".MessageButton",5e3);if(!e)throw new Error("Message button not found");console.log("💬 Opening messaging panel"),e.click(),await this.wait(800);const t=await this.findElement('.CreateConversationButton[data-conversationtype="Patient"]',5e3);if(!t)throw new Error("Patient conversation button not found");console.log("👤 Selecting patient conversation"),t.click(),await this.wait(500)}setupPathologyOverlayWatcher(){this.emrSystem?.name==="Xestro"&&(this.pathologyOverlayObserver||(this.tryEnhancePathologyOverlay(document.body),this.pathologyOverlayObserver=new MutationObserver(e=>{for(const t of e)if(t.type==="childList"){for(const o of Array.from(t.addedNodes))if(o instanceof HTMLElement&&this.tryEnhancePathologyOverlay(o))return}}),this.pathologyOverlayObserver.observe(document.body,{childList:!0,subtree:!0})))}tryEnhancePathologyOverlay(e){if(!e)return!1;const t=e instanceof HTMLElement&&e.id==="Clinical_Investigations_Edit"?e:e.querySelector?.("#Clinical_Investigations_Edit");return t&&!t.hasAttribute("data-operator-save-send")?(console.log("🩸 Pathology overlay detected - injecting Save and Send button"),this.injectSaveAndSendButton(t),!0):!1}injectSaveAndSendButton(e){const t=e.querySelector(".footer .inner");if(!t){console.warn("⚠️ Pathology overlay footer not found - cannot inject Save and Send button");return}const o=document.createElement("button");o.type="button",o.className="btn btn-default full operator-save-and-send",o.textContent="Save and Send",o.style.display="inline-block";const n=t.querySelector(".Button1");n&&n.parentElement===t?t.insertBefore(o,n):t.appendChild(o),e.setAttribute("data-operator-save-send","true"),o.addEventListener("click",()=>{this.handleSaveAndSendFlow(e,o)})}async handleSaveAndSendFlow(e,t){if(this.saveAndSendRunning){console.log("ℹ️ Save and Send already running, ignoring duplicate click");return}this.saveAndSendRunning=!0;const o=t.textContent||"Save and Send";t.disabled=!0,t.textContent="Working...";try{const n=e.querySelector(".Button2");if(!n)throw new Error("Save button not found in pathology overlay");console.log("💾 Clicking Save before messaging flow"),n.click(),await this.wait(800),await this.openMessagingAndAttachLatestRequest(),this.showSuccessMessage("Saved and prepared patient message with latest pathology slip.")}catch(n){console.error("❌ Save and Send workflow failed:",n),this.showErrorMessage("Save and Send failed. Please complete manually.")}finally{t.disabled=!1,t.textContent=o,this.saveAndSendRunning=!1}}async openMessagingAndAttachLatestRequest(){await this.openPatientConversation();const e=await this.findElement("#dropdownMenuExisting",5e3);if(!e)throw new Error("Attach dropdown not found");console.log("📎 Opening attach dropdown"),e.click(),await this.wait(300);const t=await this.findElement('.AttachFiles[data-type="REQUEST"]',5e3);if(!t)throw new Error("Investigation request attach option not found");console.log("🧪 Choosing Investigation Requests attach option"),t.click(),await this.wait(500);const o=await this.findElement('input[name="PrimaryKey[]"]',5e3);if(!o)throw new Error("No investigation request available to attach");o.checked||(console.log("✅ Selecting newest investigation request"),o.click());const n=this.findNearestAttachButton(o);n?(console.log("📎 Confirming attach action"),n.click()):console.warn("⚠️ Attach button not found after selecting investigation"),await this.wait(400),await this.populateConversationFields()}findNearestAttachButton(e){const t=["button.AttachSelected","button.AttachFilesSubmit","button.attach-button","button.btn-primary","button.btn-success"];let o=e.closest(".modal, .dialog, form, .dropdown-menu");const n=new Set;for(;o&&!n.has(o);){n.add(o);for(const s of t){const c=o.querySelector(s);if(c&&c.textContent?.toLowerCase().includes("attach"))return c}const r=Array.from(o.querySelectorAll("button")).find(s=>s.textContent?.toLowerCase().includes("attach"));if(r)return r;o=o.parentElement}return Array.from(document.querySelectorAll("button")).find(i=>i.textContent?.toLowerCase().includes("attach")&&i.offsetParent!==null)||null}async populateConversationFields(e,t,o=!0){const n=e??(o?"Blood Test Form":null),a=t??(o?"Your blood test slip is attached here.":null),i=await this.findElement("#Subject",5e3);i&&n!==null?(i.focus(),i.value=n,this.triggerAllEvents(i,n)):i||console.warn("⚠️ Subject field not found in conversation");let r=await this.findElement("#Message",5e3);r||(r=await this.findElement("textarea.conversation-message",3e3)),r&&a!==null?(r.focus(),r.value=a,this.triggerAllEvents(r,a)):r||console.warn("⚠️ Message field not found in conversation")}async openMessagingWithPrefill(e,t){await this.openPatientConversation(),await this.populateConversationFields(e,t,!1)}async clickPathologyButton(){console.log("🩸 Clicking Order Pathology icon in Xestro");let e=document.getElementById("OrderPathologyInvestigations");if(!e&&(console.log("🔍 Icon ID not found, trying button fallback..."),e=document.querySelector("button.btn-default.NewPathology"),!e)){console.log("🔍 Button selector failed, trying text-based fallback...");const t=document.querySelectorAll("button.btn-default");for(const o of t){const n=o.textContent?.toLowerCase()||"";if(n.includes("pathology")||n.includes("order pathology")){e=o,console.log("✅ Found pathology element via text search");break}}}if(e)console.log("🩸 Found pathology element, clicking..."),e.click(),await this.wait(500),console.log("✅ Order Pathology clicked successfully");else throw console.error("❌ Order Pathology element not found"),new Error("Order Pathology element not found. Please ensure you are on the correct EMR page with pathology access.")}async setupLabField(){console.log('🩸 Setting up Lab field - typing "Generic Pathology Request" and selecting from dropdown');let e=null;e=document.querySelector("#Lab"),e||(console.log("🔍 #Lab field not found, trying XPath-based selector..."),e=document.evaluate("/html/body/div[2]/div[7]/div/div[3]/div/div[1]/form/div/div[1]/div[2]/div/input[1]",document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue),e||(console.log("🔍 XPath failed, trying class-based fallback..."),e=document.querySelector("input.form-control.LabForm.ui-autocomplete-input")),e?(console.log('🩸 Found Lab setup field, typing "Generic Pathology Request"...',{id:e.id,classes:e.className,tagName:e.tagName}),e.focus(),e.value="",e.value="Generic Pathology Request",e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{key:"t",bubbles:!0})),console.log("⏳ Waiting for autocomplete dropdown to appear..."),await this.waitForAndClickAutocompleteItem("Generic Pathology Request")?console.log('✅ Lab field setup completed: selected "Generic Pathology Request" from dropdown'):(console.log("⚠️ Dropdown not found, trying Enter key fallback..."),e.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",keyCode:13,bubbles:!0})),e.dispatchEvent(new KeyboardEvent("keyup",{key:"Enter",keyCode:13,bubbles:!0})),await this.wait(100),e.blur(),console.log("✅ Lab field setup completed with Enter key fallback"))):console.warn("⚠️ Lab field (#Lab) not found - user may need to navigate manually")}async waitForAndClickAutocompleteItem(e,t=3e3){const o=Date.now();for(;Date.now()-o<t;){const n=document.querySelectorAll("ul.ui-autocomplete.ui-menu");for(const a of n){const i=a;if(i.style.display==="none"||i.offsetWidth===0)continue;console.log("🔍 Found visible autocomplete menu, searching for item...");const r=i.querySelectorAll("li.ui-menu-item");for(const s of r){const c=s,l=c.textContent||"";if(l.includes(e)&&!l.includes("start typing to search")){console.log("✅ Found matching autocomplete item:",l.substring(0,50));const d=c.querySelector("a");return d?(console.log("🖱️ Clicking autocomplete menu item..."),d.click(),await this.wait(200),!0):(console.log("🖱️ Clicking menu item directly (no anchor)..."),c.click(),await this.wait(200),!0)}}}await this.wait(100)}return console.warn("⚠️ Autocomplete dropdown with matching item not found within timeout"),!1}async insertIntoLabField(e){console.log("🩸 Inserting blood test results into tagit field:",e.substring(0,100));let t=null;if(t=document.evaluate("/html/body/div[2]/div[7]/div/div[3]/div/div[1]/form/div/div[4]/div[2]/div/ul/li/input",document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue,!t){console.log("🔍 XPath failed, trying tagit-specific selectors...");const n=["ul li input.ui-widget-content.ui-autocomplete-input","li.tagit-new input.ui-widget-content.ui-autocomplete-input","ul.tagit li input.ui-widget-content",".ui-widget-content.ui-autocomplete-input:not(#Lab):not(.form-control)"];for(const a of n){const i=document.querySelectorAll(a);for(const r of i){if(r.id==="Lab"||r.classList.contains("form-control")||r.classList.contains("LabForm")){console.log(`🚫 Results: Skipping #Lab setup field: ${r.id}`);continue}t=r,console.log(`🩸 Results: Found tagit field with selector: ${a}`,r);break}if(t)break}}if(t&&(t.id==="PatientName"||t.classList.contains("PatientName")||t.name==="PatientName"||t.id==="Lab"||t.classList.contains("form-control")||t.classList.contains("LabForm"))){console.error("🚨 ERROR: Still targeting wrong field! Aborting insertion to prevent data corruption."),console.error("   Found element:",{id:t.id,classes:t.className,name:t.name,isPatientName:t.id==="PatientName",isLabSetupField:t.id==="Lab"});return}if(t)console.log("🩸 Found correct tagit field for results insertion...",{id:t.id,classes:t.className,name:t.name,tagName:t.tagName}),t.focus(),t.value=e,t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})),t.classList.contains("ui-autocomplete-input")&&(t.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:!0})),t.dispatchEvent(new KeyboardEvent("keyup",{key:"Enter",bubbles:!0})),t.closest("li.tagit-new")&&(console.log("🩸 Detected tagit field, triggering additional events"),t.dispatchEvent(new KeyboardEvent("keypress",{key:"Enter",bubbles:!0})),t.dispatchEvent(new Event("blur",{bubbles:!0})),setTimeout(()=>{t&&t.focus()},100))),console.log("✅ Blood test results inserted into tagit field successfully");else return console.warn("⚠️ Tagit field not found, falling back to Tests Requested field"),this.insertIntoTestsRequestedField(e)}async insertIntoTestsRequestedField(e){console.log("🩸 Inserting blood test content into Tests Requested field:",e.substring(0,100));const t=this.emrSystem?.fields.testsRequested;if(!t)throw new Error("Tests Requested field not defined for this EMR system");let o=await this.findElement(t.selector,5e3);if(!o){console.log("🔍 Tests Requested field not found, trying alternative selectors...");const n=[".TestsRequested input",".tests-requested-tagit input","ul.TestsRequested input",".tagit-new input",'[name="Tests"] + .tagit input'];for(const a of n)if(o=document.querySelector(a),o){console.log("✅ Found Tests Requested field with selector:",a);break}}if(!o)throw console.error("❌ Tests Requested field not found"),new Error("Tests Requested field not found. Please ensure you are on the pathology ordering page.");if(o.tagName==="INPUT"){const n=o;n.focus(),n.value=e,["input","change","keyup"].forEach(r=>{const s=new Event(r,{bubbles:!0});n.dispatchEvent(s)});const i=new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13,bubbles:!0});n.dispatchEvent(i),console.log("✅ Content inserted into Tests Requested field")}else console.warn("⚠️ Found element is not an input field, treating as generic element"),await this.insertTextIntoElement(o,e)}async clickRadiologyButton(){console.log("📷 Clicking Order Radiology icon in Xestro");let e=document.getElementById("orderRadiologInvestigations");if(!e&&(console.log("🔍 Icon ID not found, trying button fallback..."),e=document.querySelector("button.btn-default.NewRadiology"),!e)){console.log("🔍 Button selector failed, trying text-based fallback...");const t=document.querySelectorAll("button.btn-default");for(const o of t){const n=o.textContent?.toLowerCase()||"";if(n.includes("radiology")||n.includes("order radiology")){e=o,console.log("✅ Found radiology element via text search");break}}}if(e)console.log("📷 Found radiology element, clicking..."),e.click(),await this.wait(500),console.log("✅ Order Radiology clicked successfully");else throw console.error("❌ Order Radiology element not found"),new Error("Order Radiology element not found. Please ensure you are on the correct EMR page with radiology access.")}async openQuickLetter(){const e=await this.findElement('button:contains("Quick Letter"), [data-action="quick-letter"], .quick-letter-btn, .QuickLetter');if(e)e.click();else{const t=await this.findActiveNoteArea();t&&this.focusElement(t)}}async createTask(){console.log("📝 Starting Create Task workflow (3-step sequence)...");try{console.log("🔘 Step 1: Clicking Actions button...");const t=this.findByXPath("/html/body/div[3]/div[2]/div/div[4]/div[1]/div[1]/button");if(!t)throw new Error("Actions button not found. Please ensure you are viewing a patient record.");console.log("✅ Found Actions button, clicking..."),t.click(),await this.wait(500),console.log("✅ Actions menu should be open"),console.log("🔘 Step 2: Clicking dropdown toggle...");const n=this.findByXPath("/html/body/div[2]/div[7]/div/div[3]/div/div[2]/div[2]/div/div/div[1]/div[2]/div[1]/div/button");if(!n)throw new Error("Dropdown toggle not found. Actions menu may not have loaded properly.");console.log("✅ Found dropdown toggle, clicking..."),n.click(),await this.wait(100),console.log("✅ Dropdown submenu should be expanded"),console.log("🔘 Step 3: Clicking Create Task button...");const i=this.findByXPath("/html/body/div[2]/div[7]/div/div[3]/div/div[2]/div[2]/div/div/div[1]/div[2]/div[1]/div/ul/li[2]/a");if(!i)throw new Error("Create Task button not found in dropdown menu.");console.log("✅ Found Create Task button, clicking...",{tagName:i.tagName,className:i.className,textContent:i.textContent?.trim()}),i.click(),await this.wait(500),console.log("✅ Create Task clicked successfully - dialog should be opening")}catch(e){console.error("❌ Task creation failed:",e);const t=e instanceof Error?e.message:"Unknown error occurred";throw alert(`❌ Failed to create task: ${t}

Please create the task manually.`),e}}async createTaskWithContent(e){console.log("📝 Creating task with content:",e);try{await this.createTask(),await this.wait(1e3),console.log("⏳ Waiting for task dialog to load...");const t=await this.findTaskSubjectField();t?(console.log("✅ Found Subject field, populating..."),t.focus(),t.click(),this.setValueAndDispatchInputEvents(t,e.subject),console.log(`✅ Populated Subject: ${e.subject}`)):console.warn("⚠️ Subject field not found - task may need manual entry");const o=await this.findTaskMessageField();o?(console.log("✅ Found Message field, populating..."),o.focus(),o.click(),this.setValueAndDispatchInputEvents(o,e.message),console.log(`✅ Populated Message: ${e.message.substring(0,50)}...`)):console.warn("⚠️ Message field not found - task may need manual entry"),console.log("✅ Task populated with content successfully")}catch(t){console.error("❌ Error creating task with content:",t);const o=t instanceof Error?t.message:"Unknown error";throw alert(`❌ Failed to create task with follow-up information:

${o}

Please create the task manually with this content:

Subject: ${e.subject}
Message: ${e.message.substring(0,200)}...`),t}}async findTaskSubjectField(){console.log("🔍 Searching for task Subject field...");const e=['input[name*="subject"]','input[id*="subject"]','input[placeholder*="Subject"]','input[placeholder*="subject"]',"input.subject","input.Subject"];for(const a of e){const i=document.querySelector(a);if(i&&i.offsetParent!==null)return console.log(`✅ Found Subject field via selector: ${a}`),i}const t=this.findFieldByLabelText("subject");if(t)return console.log("✅ Found Subject field via label text"),t;const n=Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).filter(a=>a.offsetParent!==null);return n.length>0?(console.log("⚠️ Using first visible input as Subject field (fallback)"),n[0]):(console.warn("❌ Subject field not found after trying all strategies"),null)}async findTaskMessageField(){console.log("🔍 Searching for task Message field...");const e=["textarea#Message",'textarea[name="Message"]',"textarea.conversation-message","textarea.form-control.conversation-message"];for(const a of e){const i=document.querySelector(a);if(i&&i.offsetParent!==null)return console.log(`✅ Found Message field via specific selector: ${a}`),i}try{const i=document.evaluate("/html/body/div[2]/div[7]/div[1]/div[3]/div/form/div[2]/div[2]/textarea",document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(i&&i.offsetParent!==null)return console.log("✅ Found Message field via XPath"),i}catch(a){console.log("⚠️ XPath search failed:",a)}const t=Array.from(document.querySelectorAll("label"));for(const a of t)if(a.textContent?.trim()==="Message"){console.log('✅ Found exact label: "Message"');const r=a.getAttribute("for");if(r){const l=document.getElementById(r);if(l&&l.tagName==="TEXTAREA"&&l.offsetParent!==null)return console.log(`✅ Found Message field via exact label 'for' attribute: #${r}`),l}let s=a.nextElementSibling;for(;s;){if(s.tagName==="TEXTAREA"&&s.offsetParent!==null)return console.log("✅ Found Message field as label sibling"),s;s=s.nextElementSibling}let c=a.parentElement;for(;c;){const l=c.querySelector("textarea");if(l&&l.offsetParent!==null)return console.log("✅ Found Message field in label parent"),l;if(c=c.parentElement,c?.tagName==="FORM")break}}const n=Array.from(document.querySelectorAll("textarea")).filter(a=>a.name==="Notes"||a.classList.contains("Notes")||(a.parentElement?.textContent?.toLowerCase()||"").includes("copy incoming")?!1:a.offsetParent!==null);return n.length>0?(console.log("⚠️ Using first visible textarea as Message field (fallback, filtered)"),n[0]):(console.warn("❌ Message field not found after trying all strategies"),null)}async appointmentWrapUp(e){this.emrSystem?.name==="Xestro"?await this.xestroAppointmentWrapUp(e):console.warn("Appointment wrap-up not implemented for this EMR system")}getXestroAppointmentIdFromWindow(){const e=window,t=["AppointmentID","AppointmentId","appointmentId","apptId","currentAppointmentId","CurrentAppointmentId","CurrentAppointmentID"];for(const o of t){const n=e?.[o];if(typeof n=="string"&&n.trim().length>0)return n.trim();if(typeof n=="number"&&Number.isFinite(n))return String(n);if(n&&typeof n=="object"){const a=[n.appointmentId,n.appointmentID,n.apptId,n.id,n.ID];for(const i of a){if(typeof i=="string"&&i.trim().length>0)return i.trim();if(typeof i=="number"&&Number.isFinite(i))return String(i)}}}return null}extractXestroId(e){const t=e.trim();if(!t)return null;const o=t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);if(o)return o[0];const n=t.match(/\d{3,}/);return n?n[0]:null}getXestroAppointmentIdFromDom(e=document){const t=['input[name="AppointmentID"]','input[name="AppointmentId"]','input[name="appointmentId"]',"input#AppointmentID","input#AppointmentId",'input[type="hidden"][name*="Appointment" i]','input[type="hidden"][id*="Appointment" i]','input[type="hidden"][name*="Appt" i]','input[type="hidden"][id*="Appt" i]','input[id*="Appointment"][id*="Id" i]','input[name*="Appointment"][name*="Id" i]','input[name*="Appt" i][name*="Id" i]','input[id*="Appt" i][id*="Id" i]','input[name*="PrimaryKey" i]','input[id*="PrimaryKey" i]','input[name*="pk" i]','input[id*="pk" i]',"[data-appointment-id]","[data-appointmentid]","[data-appt-id]","[data-apptid]"];for(const a of t){const i=e.querySelector(a);if(!i)continue;if(i instanceof HTMLInputElement){const u=this.extractXestroId(i.value||"");if(u)return u}const r=i.dataset,s=["appointmentId","appointmentID","appointmentid","apptId","apptid","apptID"];for(const u of s){const m=r?.[u];if(typeof m=="string"){const p=this.extractXestroId(m);if(p)return p}}const c=["data-appointment-id","data-appointmentid","data-appt-id","data-apptid","value"];for(const u of c){const m=i.getAttribute(u);if(typeof m=="string"){const p=this.extractXestroId(m);if(p)return p}}const l=i.getAttribute("onclick")||"",d=this.extractXestroId(l);if(d)return d}const o=Array.from(e.querySelectorAll("[onclick],[data-url],a[href]"));for(const a of o){const i=a.getAttribute("onclick")||"",r=a.getAttribute("href")||"",s=a.getAttribute("data-url")||"",c=`${i} ${r} ${s}`.toLowerCase();if(!c.includes("appt")&&!c.includes("appointment"))continue;const l=this.extractXestroId(c);if(l)return l}const n=e.querySelector("tr.appt.selected, tr.appt.active, tr.appt.ui-selected, .appt.selected, .appt.active, .appt.ui-selected");if(n){const a=["data-appointment-id","data-appointmentid","data-appt-id","data-apptid","data-id","id"];for(const r of a){const s=n.getAttribute(r);if(typeof s=="string"&&s.trim().length>0){const c=this.extractXestroId(s);if(c)return c}}const i=n.dataset;if(i){for(const[r,s]of Object.entries(i))if(s&&(r.toLowerCase().includes("appt")||r.toLowerCase().includes("appointment"))){const c=this.extractXestroId(s);if(c)return c}}}return null}getXestroAppointmentWrapUpDialogRoot(){const e=Array.from(document.querySelectorAll("div.ui-dialog")),t=e.filter(a=>a.offsetParent!==null),o=t.length?t:e;for(const a of o){const i=a.querySelector(".ui-dialog-title")?.textContent?.trim().toLowerCase()||"";if(i.includes("appt wrap up")||i.includes("wrap up"))return a}return this.findByXPath("/html/body/div[2]/div[7]")}ensureXestroAppointmentContextOrThrow(){const e=this.getXestroAppointmentIdFromWindow()||this.getXestroAppointmentIdFromDom(document);if(e)return e;throw console.warn("⚠️ Appointment wrap-up aborted: appointment ID not set"),new Error("Appointment ID is not set (no active appointment selected). Click/select the appointment in Xestro, then run Wrap Up again.")}closeXestroDialog(e){if(!e)return;e.querySelector("button.ui-dialog-titlebar-close, .ui-dialog-titlebar-close")?.click()}async xestroAppointmentWrapUp(e){if(e.preset?.taskMessage){console.log("📝 Creating task with follow-up information before opening wrap-up dialog...");try{await this.createTaskWithContent({subject:"Post Appointment Tasks",message:e.preset.taskMessage}),console.log("✅ Task created successfully")}catch(i){console.error("❌ Task creation failed, but continuing with wrap-up dialog:",i)}}this.getXestroAppointmentIdFromWindow()||this.getXestroAppointmentIdFromDom(document)||console.log("ℹ️ No appointment ID detected before opening Wrap Up dialog; proceeding and will validate after open.");const n=Array.from(document.querySelectorAll('button.btn.btn-primary.appt-wrap-up-btn, [data-action="appt-wrap-up"]')),a=n.find(i=>i.offsetParent!==null)||n[0]||null;if(a)console.log("📋 Opening appointment wrap-up dialog..."),a.click(),await this.wait(1500),e.preset&&await this.populateAppointmentPreset(e.preset);else throw new Error("Wrap Up button not found in Xestro")}findPatientDetailsXestroBoxContent(){console.log("🔍 Strategy: Patient Details XestroBoxContent - looking for patient details section...");const e=document.querySelector(".XestroBox.PatientDetailsContent .XestroBoxContent");if(e)return console.log("✅ Found PatientDetailsContent XestroBoxContent via class selector"),e;const t=document.querySelectorAll(".XestroBoxTitle");console.log(`🔍 Found ${t.length} XestroBoxTitle elements`);for(let o=0;o<t.length;o++){const n=t[o],a=n.textContent?.trim()||"";if(console.log(`🔍 XestroBoxTitle ${o+1}: "${a}"`),a==="Patient Details"){console.log('✅ Found "Patient Details" title, looking for next sibling XestroBoxContent...');let i=n.nextElementSibling;for(;i;){if(i.classList.contains("XestroBoxContent"))return console.log("✅ Found Patient Details XestroBoxContent via title search!"),i;i=i.nextElementSibling}const r=n.parentElement;if(r){const s=r.querySelector(".XestroBoxContent");if(s)return console.log("✅ Found Patient Details XestroBoxContent in parent!"),s}}}return console.log("❌ No Patient Details XestroBoxContent found"),null}extractFromPatientSelectorInput(){console.log("🔍 Strategy: Patient Selector Input - checking for patient data...");try{const e=document.querySelector("#PatientSelectorInput");if(e&&(e.value||e.placeholder)){const t=(e.value||e.placeholder).trim();if(t&&!t.toLowerCase().includes("select")&&!t.toLowerCase().includes("search"))return console.log("✅ Found patient name in selector input:",t),{name:t,extractedAt:Date.now(),extractionMethod:"patientSelectorInput"}}return console.log("❌ No patient data found in selector input"),null}catch(e){return console.error("❌ Error extracting from patient selector input:",e),null}}extractFromHiddenInputs(){console.log("🔍 Strategy: Hidden Input Fields - checking for patient data...");try{const e={extractedAt:Date.now(),extractionMethod:"hiddenInputs"},t=document.querySelector("#PatientName"),o=document.querySelector("#DialogTitleName"),n=document.querySelector("#PatientID_FYI");if(console.log("🔍 Found input elements:",{patientName:t?.value||"not found",dialogTitle:o?.value||"not found",patientId:n?.value||"not found"}),o&&o.value){const a=o.value.trim();console.log("✅ Found DialogTitleName:",a);const i=a.match(/^(.+?)\s*\((\d+)\)$/);i?(e.name=i[1].trim(),e.id=i[2],console.log("📝 Extracted from DialogTitleName - Name:",e.name,"ID:",e.id)):(e.name=a,console.log("📝 Extracted name only from DialogTitleName:",e.name))}return!e.name&&t&&t.value&&(e.name=t.value.trim(),console.log("📝 Extracted from PatientName input:",e.name)),!e.id&&n&&n.value&&(e.id=n.value.trim(),console.log("📝 Extracted from PatientID_FYI input:",e.id)),e.name?(console.log("✅ Successfully extracted from hidden inputs:",e),e):(console.log("❌ No patient data found in hidden inputs"),null)}catch(e){return console.error("❌ Error extracting from hidden inputs:",e),null}}extractPatientData(){console.log("👤 Extracting patient data from Xestro EMR page...");try{const e={extractedAt:Date.now()},t=this.extractFromHiddenInputs();if(t&&t.name)return console.log("✅ Successfully extracted using Hidden Inputs strategy:",t),t;let o=this.findPatientDetailsXestroBoxContent();if(o){console.log("✅ Strategy 2: Found Patient Details XestroBoxContent");const s=this.extractFromXestroBoxContent(o,e);if(s&&s.name)return console.log("✅ Successfully extracted using PatientDetailsXestroBoxContent strategy:",s),s}else console.log("❌ Strategy 2: No Patient Details XestroBoxContent found");const n=this.extractFromPatientSelectorInput();if(n&&n.name)return console.log("✅ Successfully extracted using PatientSelectorInput strategy:",n),n;const a=Array.from(document.querySelectorAll("div")).filter(s=>{const c=s.textContent||"",l=/^(Mr|Mrs|Ms|Dr|Miss)\s+[A-Za-z\s()]+/.test(c.trim()),d=s.querySelector(".pull-right"),u=c.includes("ID:");return l&&d&&u});if(a.length>0){o=a[0],console.log(`✅ Strategy 2: Found patient data in patient details div (${a.length} candidates)`);const s=this.extractFromPatientDetailsDiv(o,e);if(s&&s.name)return console.log("✅ Successfully extracted using PatientDetailsDiv strategy:",s),s}const i=document.querySelectorAll("div");for(let s=0;s<i.length;s++){const c=i[s],l=c.textContent||"";if(l.includes("ID:")&&/\d{4,6}/.test(l)&&c.querySelectorAll("div").length>=3){console.log("✅ Strategy 3: Found potential patient data in generic div");const u=this.extractFromGenericPatientDiv(c,e);if(u&&u.name)return console.log("✅ Successfully extracted using GenericPatientDiv strategy:",u),u}}console.log("⚠️ All primary strategies failed, attempting fallback extraction...");const r=this.extractPatientDataFallback(e);return r&&r.name?(console.log("✅ Successfully extracted using fallback strategy:",r),r):(console.log("❌ All extraction strategies failed. Page structure might be different."),console.log("🔍 Available elements for debugging:"),console.log("- .XestroBoxContent elements:",document.querySelectorAll(".XestroBoxContent").length),console.log("- .pull-right elements:",document.querySelectorAll(".pull-right").length),console.log('- Elements with "ID:" text:',Array.from(document.querySelectorAll("*")).filter(s=>s.textContent?.includes("ID:")).length),null)}catch(e){return console.error("❌ Error extracting patient data:",e),null}}extractFromXestroBoxContent(e,t){console.log("📋 Extracting from XestroBoxContent...");const o=e.querySelector("div");return o?this.extractFromPatientDetailsDiv(o,t):(console.log("❌ No content div found in XestroBoxContent"),null)}extractFromPatientDetailsDiv(e,t){console.log("📋 Extracting from patient details div...");try{let o="";const n=e.querySelector(":scope > div");if(n){console.log("🔍 Found first child div, extracting direct text content...");const l=[];for(let d=0;d<n.childNodes.length;d++){const u=n.childNodes[d];if(u.nodeType===Node.TEXT_NODE){const m=u.textContent?.trim()||"";m&&l.push(m)}}l.length>0&&(o=l.join(" ").trim(),console.log("✅ Extracted name from text nodes:",o))}if(!o){console.log("🔍 Text node extraction failed, trying fallback strategies...");const l=e,d=Array.from(l.querySelectorAll(":scope > div div, :scope > div")).filter(u=>!u.closest(".pull-right"));for(const u of d){const m=(u.textContent||"").trim();if(m&&/^(Mr|Mrs|Ms|Dr|Miss)\b/.test(m)&&!/\bID:\b/.test(m)){o=m,console.log("✅ Extracted name from fallback element:",o);break}}}if(!o){const l=e.firstChild;l&&l.nodeType===Node.TEXT_NODE&&(o=(l.textContent||"").trim())}if(!o){const l=e.firstElementChild;if(l){const d=(e.textContent||"").trim(),u=(l.textContent||"").trim(),m=d.replace(u,"").trim();m&&!/\bID:\b/.test(m)&&(o=m)}}if(!o){const d=(e.textContent||"").match(/\b(Mr|Mrs|Ms|Dr|Miss)\s+([A-Za-z\s()]+?)(?=\s*ID:|$)/);d&&(o=d[0].trim())}o&&(t.name=o,console.log("📝 Extracted name:",t.name));const a=Array.from(e.querySelectorAll("div")),i=a.find(l=>{const d=l.textContent?.trim()||"";return/^0\d{2,3}\s?\d{3}\s?\d{3}$/.test(d.replace(/\s/g,""))});i&&(t.phone=i.textContent?.trim(),console.log("📞 Extracted phone:",t.phone));const r=a.find(l=>(l.textContent?.trim()||"").toLowerCase().includes("medicare"));r&&(t.medicare=r.textContent?.trim(),console.log("🏥 Extracted Medicare status:",t.medicare));const s=e.querySelector(".pull-right");if(s){const l=s.querySelector("b");if(l&&l.textContent){const m=l.textContent.match(/ID:\s*(\d+)/);m&&(t.id=m[1],console.log("📝 Extracted ID:",t.id))}const u=(s.textContent||"").match(/(\d{2}\/\d{2}\/\d{4})\s*\((\d+)\)/);u&&(t.dob=u[1],t.age=u[2],console.log("📝 Extracted DOB:",t.dob,"Age:",t.age))}return e.querySelectorAll('div[data-allow="1"]').forEach((l,d)=>{const u=l.textContent?.trim()||"";u&&(/^[\d\s\-()+]{8,}$/.test(u)?(t.phone=u,console.log("📝 Extracted phone:",t.phone)):u.includes("@")&&u.includes(".")?(t.email=u,console.log("📝 Extracted email:",t.email)):/\b(VIC|NSW|QLD|SA|WA|TAS|ACT|NT)\b/i.test(u)&&(t.address=u,console.log("📝 Extracted address:",t.address)))}),a.forEach(l=>{const d=l.textContent?.trim()||"";if(d)if(d.includes("Medicare:")){const u=d.match(/Medicare:\s*([^<]+)/);u&&(t.medicare=u[1].trim(),console.log("📝 Extracted Medicare:",t.medicare))}else(d.includes("Private")||d.includes("Limited:"))&&(t.insurance=d,console.log("📝 Extracted insurance:",t.insurance))}),t}catch(o){return console.error("❌ Error in extractFromPatientDetailsDiv:",o),null}}extractFromGenericPatientDiv(e,t){return console.log("📋 Extracting from generic patient div..."),this.extractFromPatientDetailsDiv(e,t)}extractPatientDataFallback(e){console.log("📋 Attempting fallback patient data extraction...");try{const t=Array.from(document.querySelectorAll("*")).filter(o=>o.textContent?.includes("ID:")&&/ID:\s*\d{4,6}/.test(o.textContent));for(const o of t){const n=o.textContent||"",a=n.match(/ID:\s*(\d+)/);a&&(e.id=a[1],console.log("📝 Fallback extracted ID:",e.id));const i=n.match(/(Mr|Mrs|Ms|Dr|Miss)\s+[A-Za-z\s()]+/);if(i){e.name=i[0].trim(),console.log("📝 Fallback extracted name:",e.name);break}const r=o.parentElement;if(r){const c=(r.textContent||"").match(/(Mr|Mrs|Ms|Dr|Miss)\s+[A-Za-z\s()]+/);if(c){e.name=c[0].trim(),console.log("📝 Fallback extracted name from parent:",e.name);break}}}return e.name||e.id?e:null}catch(t){return console.error("❌ Error in fallback extraction:",t),null}}findFieldByLabelText(e){console.log(`🔍 Looking for field with label containing: "${e}"`);const t=Array.from(document.querySelectorAll("label"));for(const o of t)if(o.textContent?.toLowerCase().includes(e.toLowerCase())){console.log(`✅ Found label: "${o.textContent?.trim()}"`);const n=o.getAttribute("for");if(n){const r=document.getElementById(n);if(r)return console.log(`✅ Found field via label 'for' attribute: #${n}`),r}let a=o.nextElementSibling;for(;a;){if(a instanceof HTMLInputElement||a instanceof HTMLTextAreaElement)return console.log("✅ Found field as next sibling of label"),a;const r=a.querySelector("input, textarea");if(r)return console.log("✅ Found field as child of element after label"),r;a=a.nextElementSibling}const i=o.parentElement;if(i){const r=i.querySelector("input, textarea");if(r)return console.log("✅ Found field in same parent as label"),r}}return console.log(`❌ No field found for label: "${e}"`),null}findByXPath(e){try{return document.evaluate(e,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue}catch(t){return console.error(`❌ Error evaluating XPath: ${e}`,t),null}}triggerAllEvents(e,t){const o=e,n=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value")?.set,a=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value")?.set;o instanceof HTMLInputElement&&n?n.call(o,t):o instanceof HTMLTextAreaElement&&a&&a.call(o,t),[new Event("input",{bubbles:!0,cancelable:!0}),new Event("change",{bubbles:!0,cancelable:!0}),new KeyboardEvent("keydown",{bubbles:!0,cancelable:!0}),new KeyboardEvent("keyup",{bubbles:!0,cancelable:!0}),new FocusEvent("focus",{bubbles:!0}),new FocusEvent("blur",{bubbles:!0})].forEach(r=>e.dispatchEvent(r))}setValueAndDispatchInputEvents(e,t){const o=Object.getOwnPropertyDescriptor(e instanceof HTMLInputElement?window.HTMLInputElement.prototype:window.HTMLTextAreaElement.prototype,"value")?.set;o?o.call(e,t):e.value=t,e.dispatchEvent(new Event("input",{bubbles:!1,cancelable:!0})),e.dispatchEvent(new Event("change",{bubbles:!1,cancelable:!0}))}dispatchKey(e,t){const o={key:t.key,code:t.code,keyCode:t.keyCode,which:t.keyCode,bubbles:!1,cancelable:!0};e.dispatchEvent(new KeyboardEvent("keydown",o)),e.dispatchEvent(new KeyboardEvent("keyup",o)),e.dispatchEvent(new KeyboardEvent("keypress",o))}async acceptAutocompleteSelection(e,t){e.focus(),e.click();try{const a=e.value?.length??0;e.setSelectionRange?.(a,a)}catch{}const o=Date.now()+(t?.waitForMenuMs??800);let n=!1;for(;Date.now()<o;){const a=document.querySelector("ul.ui-autocomplete.ui-menu"),i=!!a?.querySelector(".ui-menu-item"),r=!!a&&a.style.display!=="none"&&a.offsetParent!==null;if(i&&r){n=!0;break}await this.wait(50)}n&&(this.dispatchKey(e,{key:"ArrowDown",code:"ArrowDown",keyCode:40}),await this.wait(50)),this.dispatchKey(e,{key:"Enter",code:"Enter",keyCode:13})}async populateAppointmentPreset(e){try{if(console.log("📋 Starting appointment preset population..."),console.log("📋 Preset data:",{itemCode:e.itemCode,notes:e.notes,displayName:e.displayName}),await this.wait(500),e.itemCode){console.log("🔍 Searching for Item Codes field...");let t=null;const n=this.findByXPath("/html/body/div[2]/div[7]/div/div[3]/div/div/div[1]/div/ul/li");if(n){const a=n.querySelector("input");a?(console.log("✅ Found Item Codes field via XPath (inside li element)"),t=a):(console.log("🔍 XPath element found but no input inside, checking element type..."),console.log("Element details:",{tagName:n.tagName,className:n.className,contentEditable:n.contentEditable}))}if(!t){const a=["input.item-codes-autocomplete","input.ui-autocomplete-input",'input[name*="item"]','input[name*="code"]','input[id*="item"]','input[id*="code"]','input[placeholder*="Item"]','input[placeholder*="Code"]'];for(const i of a){const r=document.querySelector(i);if(r&&r.offsetParent!==null){console.log(`✅ Found Item Codes field via selector: ${i}`),t=r;break}}}if(t||(t=this.findFieldByLabelText("item code")),!t){console.log("🔍 Trying to find visible inputs in modal...");const i=Array.from(document.querySelectorAll('input[type="text"], input:not([type])')).filter(r=>r.offsetParent!==null);console.log(`Found ${i.length} visible text inputs`),i.length>0&&(t=i[0],console.log("⚠️ Using first visible input as Item Codes field (fallback strategy)"))}if(t){console.log(`✅ Found Item Codes field, setting value to: ${e.itemCode}`);const a=this.getXestroAppointmentWrapUpDialogRoot(),i=t.closest("form")||a||document;if(!(this.getXestroAppointmentIdFromDom(i)||this.getXestroAppointmentIdFromWindow())){console.warn("⚠️ Wrap Up dialog opened without an appointment context; closing to avoid Xestro hang."),this.closeXestroDialog(a);try{const s=Array.from(i.querySelectorAll("input")),c=s.filter(d=>d.type==="hidden").slice(0,50).map(d=>({name:d.name,id:d.id,value:d.value})),l=s.slice(0,50).map(d=>({type:d.type,name:d.name,id:d.id,value:d.value}));console.warn("🔎 Wrap Up dialog inputs (first 50):",l),console.warn("🔎 Wrap Up dialog hidden inputs (first 50):",c)}catch{}throw new Error("Appointment ID is not set (wrap-up dialog missing appointment context)")}this.setValueAndDispatchInputEvents(t,""),this.setValueAndDispatchInputEvents(t,e.itemCode),await this.wait(100),await this.acceptAutocompleteSelection(t,{waitForMenuMs:1e3}),console.log(`✅ Populated Item Code: ${e.itemCode}`)}else console.warn("⚠️ Item codes input field not found after trying all strategies"),console.log("💡 Available inputs:",Array.from(document.querySelectorAll("input")).map(a=>({type:a.type,name:a.getAttribute("name"),id:a.id,class:a.className,placeholder:a.placeholder})))}console.log("📝 Notes field left blank (task created separately)"),console.log(`✅ Successfully applied preset: ${e.displayName}`)}catch(t){console.error("❌ Error populating appointment preset:",t)}}async ensurePatientRecordView(){if(!this.emrSystem)return;if(!await this.findElement(this.emrSystem.selectors.patientRecord,1e3)){const t=await this.findElement('button:contains("Record"), [data-view="record"], .record-view-btn');t&&(t.click(),await this.wait(2e3))}}async ensurePatientRecordOpened(){console.log("🔍 Ensuring patient record is opened...");const e=document.querySelectorAll(".XestroBox");console.log(`🔍 Initial XestroBox count: ${e.length}`);let t=await this.findElement("button.PatientDetailsButton");if(t||(t=await this.findButtonByText("Patient Record")),t||(t=await this.findButtonByText("Patient")),!t){const o=document.querySelectorAll("button.btn-default");for(const n of o)if(n.textContent?.includes("Patient")){t=n;break}}if(t){console.log("🔍 Found Patient Record button, clicking..."),t.click(),await this.wait(3e3);const o=document.querySelectorAll(".XestroBox");console.log(`🔍 Final XestroBox count: ${o.length}`),o.length===0?console.warn("⚠️ Patient record button clicked but no clinical content found"):o.length>e.length?console.log("✅ Patient record opened successfully - clinical content detected"):console.log("ℹ️ Patient record may have already been open")}else console.warn("⚠️ Patient Record button not found - proceeding with extraction"),console.log("💡 Available buttons:",Array.from(document.querySelectorAll("button")).map(o=>o.textContent?.trim()).filter(Boolean))}async findActiveNoteArea(){return this.emrSystem?await this.findElement(this.emrSystem.selectors.noteArea):null}async findElement(e,t=5e3){const o=Date.now();for(;Date.now()-o<t;){if(e.includes(":contains(")){const n=e.match(/(.+):contains\("(.+)"\)/);if(n){const[,a,i]=n,r=document.querySelectorAll(a);for(const s of r)if(s.textContent?.includes(i))return s}}else{const n=document.querySelector(e);if(n)return n}await this.wait(100)}return null}focusElement(e){e.focus(),e.scrollIntoView({behavior:"smooth",block:"center"});const t=e.style.cssText;e.style.cssText+="border: 2px solid #3b82f6 !important; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5) !important;",setTimeout(()=>{e.style.cssText=t},2e3)}isTextInputElement(e){if(!e)return!1;const t=e.tagName.toLowerCase();return t==="textarea"||t==="input"&&["text","email","search","url"].includes(e.type)||e.contentEditable==="true"}updateFieldMappings(){}async findAndClickXestroBox(e){console.log(`🔍 Looking for XestroBox with title "${e}"`);const t=l=>l.replace(/\s+/g," ").trim().toLowerCase(),o=t(e),n=l=>{if(!l)return null;let d=l;for(;d;){if(d.querySelector?.(".XestroBoxTitle"))return d;d=d.parentElement}return null},a=n(document.getElementById("patientNotesSave"))||n(document.getElementById("patientNotesInput"))||n(document.getElementById("patientNoteInput")),i=a??document,r=Array.from(i.querySelectorAll(".XestroBox"));console.log(`Found ${r.length} XestroBox elements`);const s=r.map((l,d)=>{const u=l.querySelector(".XestroBoxTitle"),m=u?.textContent||"",p=t(m),f=!!l.closest?.('.modal, [role="dialog"], [aria-modal="true"]'),g=l.offsetParent!==null&&!!u&&u.offsetParent!==null;return{box:l,titleElement:u,rawTitle:m,title:p,index:d,visible:g,eligible:a?!f:!0}}).filter(l=>l.titleElement&&l.title&&l.visible&&l.eligible),c=s.find(l=>l.title===o)||s.find(l=>l.title.startsWith(o))||s.find(l=>l.title.includes(o));return c?.titleElement?(console.log(`✅ Found XestroBox for "${e}" at index ${c.index}`),console.log(`🖱️ Clicking XestroBox title: "${c.rawTitle}"`),c.titleElement.click(),await this.wait(500),c.box):(console.log(`❌ No XestroBox found matching "${e}"`),r.forEach((l,d)=>{const u=l.querySelector(".XestroBoxTitle");console.log(`  ${d+1}. XestroBoxTitle: "${u?.textContent||"No title"}"`)}),null)}async waitForAddNoteArea(){for(let n=0;n<50;n++){const a=document.getElementById("AddNoteArea");if(a&&a.offsetParent!==null)return console.log(`✅ AddNoteArea found after ${n*100}ms`),a;n%10===0&&console.log(`⏳ Still waiting for AddNoteArea... (${n*100}ms)`),await this.wait(100)}return console.log("❌ AddNoteArea not found after 5000ms"),null}async wait(e){return new Promise(t=>setTimeout(t,e))}getPageStatus(){const e=window.location.href,t=document.title,o=document.readyState,n=document.querySelectorAll(".XestroBox").length>0,a=document.querySelector("#patientNotesInput, #AddNoteArea")!==null,i=document.querySelectorAll(".appointmentBook, .one-appt-book").length>0,r=document.querySelector("input.date.form-control")!==null;let s="unknown";return i&&r?s="calendar":n&&a?s="patient":e.includes("Dashboard")&&(s="dashboard"),{url:e,title:t,readyState:o,pageType:s,isReady:o==="complete"&&(s==="calendar"||s==="patient"&&n),elements:{xestroBoxCount:document.querySelectorAll(".XestroBox").length,hasPatientNotes:a,hasCalendarElements:i,hasDateInput:r},timestamp:Date.now()}}async handleProfilePhoto(e){if(console.log("📸 Handling profile photo capture:",e),e?.imageData)try{console.log("📸 Opening photo upload interface..."),await this.openPhotoUploadInterface(),await this.insertImageIntoDropZone(e.imageData,e.method||"tab-capture"),console.log("✅ Profile photo workflow completed successfully")}catch(t){throw console.error("❌ Profile photo workflow failed:",t),this.showErrorMessage(`Profile photo failed: ${t instanceof Error?t.message:"Unknown error"}`),t}else throw console.log("📸 No image data provided, showing capture instructions"),this.showErrorMessage("Profile photo capture requires image data"),new Error("Profile photo capture requires image data")}async insertImageIntoDropZone(e,t){console.log(`📸 Inserting image into DropZone using method: ${t}`);try{console.log("🔍 Step 4: Looking for DropZone element...");const o=await this.findDropZone();if(!o)throw console.error("❌ Step 4 failed: DropZone not found on page"),console.log("🔍 This usually means the Upload button click did not work properly"),console.log("🔍 Current page state:"),console.log("  - URL:",window.location.href),console.log("  - Modal elements:",document.querySelectorAll('.modal, [class*="modal"]').length),console.log("  - Upload elements:",document.querySelectorAll('input[type="file"], [class*="upload"], [class*="drop"]').length),this.showErrorMessage("Upload area not found. Please try clicking the profile photo manually and then use the extension."),new Error("DropZone field not found - the upload interface may not have loaded properly");console.log("✅ Step 4 completed: Found DropZone element"),console.log("📸 DropZone details:",{tagName:o.tagName,id:o.id,className:o.className,visible:o.offsetParent!==null}),console.log("🔄 Step 5: Converting image data to file...");const n=await this.base64ToFile(e,"profile-photo.png");console.log("✅ Step 5 completed: File created",{name:n.name,size:n.size,type:n.type}),console.log("🔄 Step 6: Simulating file drop..."),await this.simulateFileDrop(o,n),console.log("✅ Step 6 completed: File drop simulation finished"),await this.wait(1e3),document.querySelector('img[src*="blob:"], img[src*="data:"], .uploaded-image, .image-preview')?(console.log("✅ Upload appears successful - found uploaded image preview"),this.showSuccessMessage("Profile photo uploaded successfully!")):(console.log("⚠️ Upload status unclear - no image preview detected"),this.showSuccessMessage("Profile photo uploaded (verification incomplete)")),console.log("✅ Profile photo insertion workflow completed")}catch(o){throw console.error("❌ Error inserting image into DropZone:",o),this.showErrorMessage(`Failed to upload profile photo: ${o instanceof Error?o.message:"Unknown error"}`),o}}async openPhotoUploadInterface(){console.log("🔄 Starting photo upload interface navigation...");try{console.log("🔄 Step 1: Clicking sidebar patient photo...");const e=await this.findElementWithRetry(["#SidebarPatientPhoto",".sidebar-patient-photo",'[id*="patient"][id*="photo" i]','img[alt*="patient" i]'],5e3,3);if(!e)throw console.error("❌ Step 1 failed: Could not find sidebar patient photo"),console.log("🔍 Available elements on page:",document.querySelectorAll('[id*="patient"], [class*="patient"], img').length),new Error("Could not find sidebar patient photo. The patient edit window may not have opened correctly.");console.log("✅ Found sidebar patient photo element:",e.id||e.className),e.click(),await this.wait(1500),console.log("🔍 Validating patient photo click result..."),await this.wait(500),console.log("🔄 Step 2: Clicking Profile Picture tab/description...");const t=await this.findProfilePictureTab();if(!t)throw console.error("❌ Step 2 failed: Could not find Profile Picture tab"),console.log("🔍 Available descriptions:",Array.from(document.querySelectorAll('.description, .tab, .tab-item, [role="tab"]')).map(n=>n.textContent?.trim()).filter(n=>n)),new Error("Could not find Profile Picture tab. The patient modal may not have opened correctly.");console.log("✅ Found Profile Picture tab:",t.textContent?.trim()),t.click(),await this.wait(1500),console.log("🔄 Step 3: Clicking Upload New button...");const o=await this.findElementWithRetry(["#UploadPhotoButton",'button:contains("Upload New")','button:contains("Upload")','button:contains("Browse")','[data-action="upload"]','input[type="file"]'],5e3,3);if(!o)throw console.error("❌ Step 3 failed: Could not find Upload button"),console.log("🔍 Available buttons in profile section:",Array.from(document.querySelectorAll('button, input[type="file"]')).map(n=>n.textContent?.trim()||n.getAttribute("type")).filter(n=>n)),new Error("Could not find Upload New button. The Profile Picture tab may not have loaded correctly.");console.log("✅ Found upload button:",o.textContent?.trim()||o.tagName),o.click(),await this.wait(2e3),console.log("✅ Photo upload interface navigation completed successfully")}catch(e){throw console.error("❌ Failed to open photo upload interface:",e),console.log("🔍 Current page URL:",window.location.href),console.log("🔍 Current page title:",document.title),console.log("🔍 Page contains patient edit elements:",document.querySelectorAll('[id*="edit"], [class*="edit"], .modal').length>0),new Error(`Navigation failed at step: ${e instanceof Error?e.message:"Unknown error"}`)}}async findDropZone(){console.log("🔍 Looking for DropZone element...");let e=await this.waitForDropZone();if(e)return console.log("✅ Found DropZone with primary selector"),e;const t=['[class*="dropzone" i]','[class*="drop-zone" i]','[class*="file-drop" i]','[class*="upload-zone" i]',".file-upload-area",'[data-drop="true"]','input[type="file"]'];return console.log("🔍 Trying alternative DropZone selectors..."),e=await this.findElementWithRetry(t,5e3,2),e?(console.log("✅ Found DropZone with alternative selector"),e):(console.warn("⚠️ Could not find DropZone even with alternative selectors"),console.log("🔍 Available file-related elements:",document.querySelectorAll('input[type="file"], [class*="upload"], [class*="drop"]').length),null)}async waitForDropZone(e=5e3){console.log("⏳ Waiting for DropZone to appear...");const t=Date.now(),o=200;for(;Date.now()-t<e;){const n=document.querySelector("#DropZone");if(n&&n.offsetParent!==null)return console.log("✅ DropZone appeared and is visible"),n;await this.wait(o)}return console.log("❌ Timeout waiting for DropZone to appear"),null}async base64ToFile(e,t){const o=e.replace(/^data:image\/\w+;base64,/,""),n=atob(o),a=new Array(n.length);for(let s=0;s<n.length;s++)a[s]=n.charCodeAt(s);const i=new Uint8Array(a),r=new Blob([i],{type:"image/png"});return new File([r],t,{type:"image/png"})}async simulateFileDrop(e,t){console.log("📁 Simulating file drop into DropZone");const o={0:t,length:1,item:s=>s===0?t:null},n=new DragEvent("dragenter",{bubbles:!0,cancelable:!0,dataTransfer:new DataTransfer}),a=new DragEvent("dragover",{bubbles:!0,cancelable:!0,dataTransfer:new DataTransfer}),i=new DragEvent("drop",{bubbles:!0,cancelable:!0,dataTransfer:new DataTransfer});i.dataTransfer?.items.add(t),e.dispatchEvent(n),await this.wait(50),e.dispatchEvent(a),await this.wait(50),e.dispatchEvent(i);const r=e.querySelector('input[type="file"]');r&&(console.log("📁 Found file input, setting files directly"),Object.defineProperty(r,"files",{value:o,writable:!1}),r.dispatchEvent(new Event("change",{bubbles:!0}))),console.log("📁 File drop simulation completed")}showSuccessMessage(e){const t=document.createElement("div");t.textContent=e,t.style.cssText=`
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="slideOutRight 0.3s ease-out",setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},300)},3e3)}async showScreenshotInstructions(e){console.log("📸 Showing screenshot instructions:",e);try{console.log("📸 Opening photo upload interface for clipboard workflow..."),await this.openPhotoUploadInterface()}catch(m){console.error("❌ Failed to open photo upload interface for clipboard workflow:",m)}const t=document.createElement("div");t.id="screenshot-instructions-modal",t.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;const o=document.createElement("div");o.style.cssText=`
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      font-family: system-ui, sans-serif;
      animation: scaleIn 0.3s ease-out;
    `;const n=document.createElement("h2");n.textContent="📸 Take Screenshot",n.style.cssText=`
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      text-align: center;
    `;const a=document.createElement("p");a.textContent=e.tabCaptureError?`No doxy.me tabs found. ${e.tabCaptureError}`:"No doxy.me tabs found. Please take a manual screenshot.",a.style.cssText=`
      margin: 0 0 20px 0;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
      line-height: 1.5;
    `;const i=document.createElement("div");i.style.cssText=`
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      margin: 20px 0;
    `,(e.instructions||["Press cmd+shift+4 to take a screenshot","Select the area you want to capture","The image will automatically be inserted when ready"]).forEach((m,p)=>{const f=document.createElement("div");f.style.cssText=`
        display: flex;
        align-items: flex-start;
        margin: ${p>0?"12px":"0"} 0 0 0;
        font-size: 14px;
        color: #374151;
        line-height: 1.5;
      `;const g=document.createElement("span");g.textContent=`${p+1}.`,g.style.cssText=`
        display: inline-block;
        width: 20px;
        font-weight: 600;
        color: #3b82f6;
        flex-shrink: 0;
      `;const h=document.createElement("span");h.textContent=m,f.appendChild(g),f.appendChild(h),i.appendChild(f)});const s=document.createElement("div");s.style.cssText=`
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #fef3c7;
      border-radius: 8px;
      margin: 20px 0;
    `;const c=document.createElement("span");c.textContent="⏳ Waiting for screenshot...",c.style.cssText=`
      font-size: 14px;
      font-weight: 500;
      color: #92400e;
    `,s.appendChild(c);const l=document.createElement("button");l.textContent="📋 Manual Paste",l.style.cssText=`
      width: 100%;
      padding: 12px;
      background: #3b82f6;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-bottom: 12px;
    `,l.addEventListener("mouseenter",()=>{l.style.backgroundColor="#2563eb"}),l.addEventListener("mouseleave",()=>{l.style.backgroundColor="#3b82f6"}),l.addEventListener("click",async()=>{try{console.log("📋 Manual paste button clicked, attempting clipboard read...");const m=await navigator.clipboard.read();if(m.length===0){alert("No items found in clipboard. Please copy an image first.");return}let p=!1;for(let f=0;f<m.length;f++){const g=m[f],h=["image/png","image/jpeg","image/jpg","image/gif","image/webp","image/bmp"],y=g.types.find(b=>h.includes(b)||b.startsWith("image/"));if(y){console.log(`📋 Found image in clipboard: ${y}`);const b=await g.getType(y),v=await this.blobToBase64(b);this.closeScreenshotModal(),await this.insertImageIntoDropZone(v,"manual-paste");try{await chrome.runtime.sendMessage({type:"CLIPBOARD_MONITORING_RESULT",data:{success:!0,imageData:v,method:"manual-paste"}})}catch(k){console.error("Failed to notify service worker:",k)}p=!0;break}}p||alert("No image found in clipboard. Please copy an image and try again.")}catch(m){console.error("Manual paste failed:",m),alert("Failed to access clipboard. Please ensure you have copied an image and try again.")}});const d=document.createElement("button");d.textContent="Cancel",d.style.cssText=`
      width: 100%;
      padding: 12px;
      background: #f3f4f6;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: background-color 0.2s;
    `,d.addEventListener("mouseenter",()=>{d.style.backgroundColor="#e5e7eb"}),d.addEventListener("mouseleave",()=>{d.style.backgroundColor="#f3f4f6"}),d.addEventListener("click",()=>{this.closeScreenshotModal()}),o.appendChild(n),o.appendChild(a),o.appendChild(i),o.appendChild(s),o.appendChild(l),o.appendChild(d),t.appendChild(o);const u=document.createElement("style");u.textContent=`
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes scaleOut {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(0.9); opacity: 0; }
      }
    `,document.head.appendChild(u),document.body.appendChild(t),console.log("📸 Screenshot instructions modal shown")}closeScreenshotModal(){const e=document.getElementById("screenshot-instructions-modal");if(e){e.style.animation="fadeOut 0.3s ease-out";const t=e.querySelector("div");t&&(t.style.animation="scaleOut 0.3s ease-out"),setTimeout(()=>{e.parentNode&&e.parentNode.removeChild(e)},300),console.log("📸 Screenshot instructions modal closed")}}async startClipboardMonitoring(e){console.log(`📸 Starting enhanced clipboard monitoring for ${e/1e3} seconds...`);const t=Date.now(),o=500;let n=null,a=0;const i=async()=>{const r=Date.now()-t;if(a++,r>=e){console.log(`❌ Clipboard monitoring timeout after ${a} checks over ${r/1e3} seconds`);try{await chrome.runtime.sendMessage({type:"CLIPBOARD_MONITORING_RESULT",data:{success:!1,error:`Timeout waiting for screenshot in clipboard (${a} checks)`}})}catch(s){console.error("❌ Failed to notify service worker of timeout:",s)}return}a%10===0&&console.log(`📸 Clipboard monitoring: check ${a}, ${Math.round((e-r)/1e3)}s remaining`);try{if(document.hasFocus&&!document.hasFocus()&&(console.log("📸 Page not focused, attempting to focus..."),window.focus(),await new Promise(u=>setTimeout(u,100))),(await navigator.permissions.query({name:"clipboard-read"})).state==="denied")throw console.error("❌ Clipboard read permission denied"),new Error("Clipboard read permission denied");const c=await navigator.clipboard.read(),l=c.map(u=>u.types.join(",")).join("|"),d=n!==l;d?(console.log(`📸 Clipboard content changed! Found ${c.length} items (check ${a})`),n=l):a%20===0&&console.log(`📸 No clipboard change detected (check ${a})`);for(let u=0;u<c.length;u++){const m=c[u];d&&console.log(`📸 Clipboard item ${u+1} types:`,m.types);const p=["image/png","image/jpeg","image/jpg","image/gif","image/webp","image/bmp","image/svg+xml","image/tiff","image/ico","image/avif"],f=m.types.find(g=>p.includes(g)||g.startsWith("image/"));if(f){console.log(`📸 ✅ IMAGE DETECTED in clipboard! Type: ${f}, Size check starting...`);try{const g=await Promise.race([m.getType(f),new Promise((y,b)=>setTimeout(()=>b(new Error("Blob retrieval timeout")),5e3))]);if(console.log(`📸 ✅ Successfully retrieved blob: ${g.size} bytes, type: ${g.type}`),g.size===0){console.warn("⚠️ Blob is empty, skipping...");continue}if(g.size>10*1024*1024){console.warn(`⚠️ Blob too large: ${g.size} bytes, skipping...`);continue}console.log(`📸 Converting ${g.size} byte blob to base64...`);const h=await this.blobToBase64(g);if(console.log(`📸 ✅ Successfully converted to base64: ${h.length} characters`),!h.startsWith("data:image/")){console.warn("⚠️ Invalid base64 image data format, skipping...");continue}console.log("🎉 CLIPBOARD IMAGE PROCESSING SUCCESSFUL! Closing modal and inserting image..."),this.closeScreenshotModal(),await this.insertImageIntoDropZone(h,"clipboard");try{await chrome.runtime.sendMessage({type:"CLIPBOARD_MONITORING_RESULT",data:{success:!0,imageData:h,method:"clipboard",imageType:f,imageSize:g.size,checksCount:a}}),console.log("✅ Successfully notified service worker of clipboard success")}catch(y){console.error("❌ Failed to notify service worker of success:",y)}return}catch(g){if(console.error(`❌ Failed to process clipboard image blob (${f}):`,g),u<c.length-1){console.log("🔄 Trying next clipboard item...");continue}}}}setTimeout(i,o)}catch(s){const c=s instanceof Error?s.message:String(s);if(console.error(`❌ Clipboard access failed (check ${a}):`,c),c.includes("permission")||c.includes("denied")){console.error("🚫 Clipboard permission issue - stopping monitoring");try{await chrome.runtime.sendMessage({type:"CLIPBOARD_MONITORING_RESULT",data:{success:!1,error:`Clipboard permission denied: ${c}`}})}catch(l){console.error("❌ Failed to notify service worker of permission error:",l)}return}console.log("🔄 Continuing monitoring with longer interval due to error..."),setTimeout(i,o*2)}};try{const r=await navigator.clipboard.read();n=r.map(s=>s.types.join(",")).join("|"),console.log(`📸 Initial clipboard state: ${r.length} items`)}catch(r){console.log("📸 Could not read initial clipboard state:",r)}console.log("📸 🚀 Starting clipboard monitoring loop..."),i()}async blobToBase64(e){return new Promise((t,o)=>{const n=new FileReader;n.onload=()=>t(n.result),n.onerror=o,n.readAsDataURL(e)})}async extractEMRData(e){console.log("📋 Extracting EMR data for fields:",e),console.log("📋 Current page URL:",window.location.href),console.log("📋 Current page type:",window.location.href.includes("Dashboard")?"DASHBOARD":"PATIENT_PAGE");const t=document.querySelectorAll(".XestroBox");let o=document.querySelector("button.PatientDetailsButton");if(o||(o=await this.findButtonByText("Patient Record")),console.log("📋 Found XestroBox elements:",t.length),console.log("📋 Patient Record button present:",!!o),t.length===0)if(console.warn("⚠️ No XestroBox elements found - patient record may not be opened"),o){console.warn("💡 Patient Record button is available - attempting to open record");try{await this.ensurePatientRecordOpened();const a=document.querySelectorAll(".XestroBox");a.length===0?(console.warn("⚠️ Still no XestroBox elements after clicking Patient Record button"),console.warn("💡 Proceeding with extraction but results may be limited")):console.log(`✅ Found ${a.length} XestroBox elements after opening record`)}catch(a){console.warn("⚠️ Failed to open patient record:",a)}}else console.warn("💡 EMR data extraction requires patient page with clinical fields"),console.warn("💡 Make sure you are on the correct patient page");const n={};for(const a of e)try{let i="";switch(this.normalizeFieldName(a)){case"background":i=await this.extractFieldContent("Background");break;case"investigations":case"investigation-summary":i=await this.extractFieldContent("Investigation Summary");break;case"medications":i=await this.extractFieldContent("Medications (Problem List for Phil)")||await this.extractFieldContent("Medications");break;default:i=await this.extractFieldContent(a)}n[a]=i,console.log(`📋 Extracted ${a}: ${i?i.length+" chars":"empty"}`)}catch(i){console.warn(`⚠️ Failed to extract field "${a}":`,i),n[a]=""}return console.log("📋 EMR data extraction completed:",Object.keys(n)),n}async extractEMRDataForAIReview(e){if(console.log("🤖 AI REVIEW EXTRACTION: Starting non-invasive EMR extraction for fields:",e),console.log("🤖 AI REVIEW EXTRACTION: Current URL:",window.location.href),console.log("🤖 AI REVIEW EXTRACTION: Page title:",document.title),!window.location.href.includes("my.xestro.com"))throw new Error("Not on Xestro EMR page - please navigate to my.xestro.com");const t=document.querySelectorAll(".XestroBox");if(console.log(`🤖 AI REVIEW EXTRACTION: Found ${t.length} XestroBox elements on page`),t.length===0)throw new Error("No XestroBox elements found - please navigate to a patient record page");console.log("🤖 AI REVIEW EXTRACTION: Available XestroBox titles:"),t.forEach((r,s)=>{const l=r.querySelector(".XestroBoxTitle")?.textContent||"No title";console.log(`  [${s}] "${l}"`)});const o={},n={};for(const r of e){console.log(`
🤖 AI REVIEW EXTRACTION: Processing field: "${r}"`);let s="",c=null;const l={fieldName:r,attempts:[]};try{const d=r.toLowerCase();switch(c=this.highlightFieldDuringExtraction(d),await this.wait(300),d){case"background":l.searchTerms=["Background"],s=await this.extractCustomNoteContent("Background"),l.attempts.push({searchTerm:"Background",result:s.length>0?"success":"empty"});break;case"investigations":case"investigation-summary":l.searchTerms=["Investigation Summary"],s=await this.extractCustomNoteContent("Investigation Summary"),l.attempts.push({searchTerm:"Investigation Summary",result:s.length>0?"success":"empty"});break;case"medications-problemlist":l.searchTerms=["Medications (Problem List for Phil)"],s=await this.extractCustomNoteContent("Medications (Problem List for Phil)"),l.attempts.push({searchTerm:"Medications (Problem List for Phil)",result:s.length>0?"success":"empty"});break;case"medications":console.warn('🤖 AI REVIEW EXTRACTION: Generic "medications" field requested. Trying specific fields...'),l.searchTerms=["Medications (Problem List for Phil)","Medications"],s=await this.extractCustomNoteContent("Medications (Problem List for Phil)"),l.attempts.push({searchTerm:"Medications (Problem List for Phil)",result:s.length>0?"success":"empty"}),s||(s=await this.extractCustomNoteContent("Medications"),l.attempts.push({searchTerm:"Medications",result:s.length>0?"success":"empty"}));break;default:l.searchTerms=[r],s=await this.extractCustomNoteContent(r),l.attempts.push({searchTerm:r,result:s.length>0?"success":"empty"})}l.finalResult={success:s.length>0,contentLength:s.length,preview:s.length>0?s.substring(0,100)+(s.length>100?"...":""):"No content"},s?(console.log(`✅ AI REVIEW EXTRACTION: Successfully extracted "${r}": ${s.length} chars`),console.log(`   Preview: "${s.substring(0,100)}${s.length>100?"...":""}"`)):console.log(`⚠️ AI REVIEW EXTRACTION: No content found for "${r}"`),o[r]=s,n[r]=l}catch(d){console.error(`❌ AI REVIEW EXTRACTION: Failed to extract "${r}":`,d),l.error=d instanceof Error?d.message:String(d),o[r]="",n[r]=l}finally{c&&this.removeFieldHighlight(c)}}const a=Object.entries(o).filter(([,r])=>r.length>0),i=Object.keys(o).length;if(console.log(`
🤖 AI REVIEW EXTRACTION: SUMMARY`),console.log(`   Successful extractions: ${a.length}/${i}`),console.log("   Extraction details:",n),console.log("   Final extracted data keys:",Object.keys(o)),a.length===0)throw console.error("🤖 AI REVIEW EXTRACTION: No data extracted from any field"),console.log("🤖 AI REVIEW EXTRACTION: Diagnostic info:"),console.log("   - Available XestroBox titles:",Array.from(t).map(r=>r.querySelector(".XestroBoxTitle")?.textContent||"No title")),new Error(`No EMR data could be extracted. Available fields: ${Array.from(t).map(r=>r.querySelector(".XestroBoxTitle")?.textContent||"No title").join(", ")}`);return console.log("✅ AI REVIEW EXTRACTION: Non-invasive extraction completed successfully"),o}highlightFieldDuringExtraction(e){try{let t=null;switch(e){case"background":t=this.findFieldContainer("Background");break;case"investigations":t=this.findFieldContainer("Investigation Summary")||this.findFieldContainer("Investigations");break;case"medications-problemlist":t=this.findFieldContainer("Medications")||this.findFieldContainer("Problem List");break;default:t=this.findFieldContainer(e)}return t?(t.style.transition="all 0.3s ease",t.style.boxShadow="0 0 0 3px rgba(59, 130, 246, 0.3)",t.style.backgroundColor="rgba(59, 130, 246, 0.05)",t.style.borderRadius="8px",console.log(`✨ Highlighted field: ${e}`),t):null}catch(t){return console.warn(`⚠️ Failed to highlight field ${e}:`,t),null}}removeFieldHighlight(e){try{e.style.boxShadow="",e.style.backgroundColor="",e.style.borderRadius="",setTimeout(()=>{e.style.transition=""},300),console.log("🔄 Removed field highlighting")}catch(t){console.warn("⚠️ Failed to remove field highlighting:",t)}}findFieldContainer(e){try{const t=document.querySelectorAll(".XestroBoxTitle");for(const a of t)if(a.textContent?.includes(e))return a.closest(".XestroBox")||a.parentElement;const o=[`[data-field="${e.toLowerCase()}"]`,`[data-field-name="${e.toLowerCase()}"]`,`.${e.toLowerCase().replace(/\s+/g,"-")}-field`,`.field-${e.toLowerCase().replace(/\s+/g,"-")}`];for(const a of o){const i=document.querySelector(a);if(i)return i}const n=document.querySelectorAll(".XestroBox, .field, .section, .form-group");for(const a of n)if(a.textContent?.includes(e))return a;return console.log(`⚠️ Could not find container for field: ${e}`),null}catch(t){return console.warn(`⚠️ Error finding field container for ${e}:`,t),null}}normalizeFieldName(e){return e.toLowerCase().replace(/[_\s-]+/g,"-")}async extractCustomNoteContent(e){console.log(`📋 Looking for customNote content in field: "${e}"`);try{const t=await this.findXestroBoxByTitle(e);if(!t)return console.log(`⚠️ No XestroBox found for "${e}"`),"";const o=t.querySelectorAll(".customNote");if(console.log(`📋 Found ${o.length} customNote elements in "${e}" XestroBox`),o.length===0)return console.log(`⚠️ No .customNote elements found in "${e}" XestroBox`),"";let n="";for(let a=0;a<o.length;a++){const i=o[a],r=(i.textContent||i.innerText||"").trim();if(r){n?n+=`

`+r:n=r;const s=i.offsetParent!==null;console.log(`📋 Extracted customNote ${a+1} content: ${r.length} chars (visible: ${s})`)}}return n?(console.log(`✅ Total customNote content for "${e}": ${n.length} chars`),n):(console.log(`⚠️ No visible content found in customNote elements for "${e}"`),"")}catch(t){return console.error(`❌ Error extracting customNote content for "${e}":`,t),""}}async extractFieldContent(e){console.log(`📋 Extracting content for field: "${e}"`);try{const t=await this.extractCustomNoteContent(e);if(t)return console.log(`📋 Found customNote content for "${e}": ${t.length} chars`),t;const o=await this.findXestroBoxByTitle(e);if(o){console.log(`✅ Found XestroBox for "${e}"`);let a=!1;const i=o.querySelector(".XestroBoxTitle");i&&(i.click(),a=!0,await this.wait(300));let r="";const s=o.querySelector("textarea");if(s&&s.offsetParent!==null)r=s.value.trim(),console.log(`📋 Found textarea content for "${e}": ${r.length} chars`);else{const c=o.querySelectorAll('[contenteditable="true"]');for(const l of c){const d=l;if(d.offsetParent!==null){const u=(d.textContent||d.innerText||"").trim();if(u){r=u,console.log(`📋 Found contenteditable content for "${e}": ${u.length} chars`);break}}}}if(a&&await this.closeAnyOpenDialog(),r)return r}const n=[`textarea[data-field="${e.toLowerCase()}"]`,`textarea[placeholder*="${e}"]`,`textarea[aria-label*="${e}"]`,`#${e.replace(/\s+/g,"").toLowerCase()}`,`.${e.replace(/\s+/g,"-").toLowerCase()}`];for(const a of n){const i=document.querySelector(a);if(i&&i.offsetParent!==null){const r=i.value.trim();return console.log(`📋 Found fallback content for "${e}" via ${a}: ${r.length} chars`),r}}return console.log(`⚠️ No content found for field "${e}"`),""}catch(t){return console.error(`❌ Error extracting field "${e}":`,t),""}}async closeAnyOpenDialog(){console.log("🚪 Attempting to close any open dialogs...");try{const e=new KeyboardEvent("keydown",{key:"Escape",code:"Escape",keyCode:27,which:27,bubbles:!0,cancelable:!0});document.dispatchEvent(e),await this.wait(200);const t=['button[aria-label="Close"]',"button.close",".modal-close",".dialog-close","button:has(.fa-times)","button:has(.fa-close)",'[data-dismiss="modal"]'];for(const o of t){const n=document.querySelector(o);if(n&&n.offsetParent!==null){console.log(`🚪 Found close button: ${o}`),n.click(),await this.wait(200);break}}console.log("✅ Dialog close attempt completed")}catch(e){console.error("❌ Error closing dialog:",e)}}async findXestroBoxByTitle(e){console.log(`🔍 Looking for XestroBox with title: "${e}"`);const t=document.querySelectorAll(".XestroBox");console.log(`🔍 Found ${t.length} XestroBox elements`),t.forEach((n,a)=>{const r=n.querySelector(".XestroBoxTitle")?.textContent||"No title";console.log(`🔍 XestroBox ${a}: "${r}"`)});for(const n of t){const a=n.querySelector(".XestroBoxTitle");if(a&&a.textContent?.includes(e))return console.log(`✅ Found XestroBox with matching title: "${a.textContent}"`),n}const o=[e.split(" ")[0],e.replace(/\s+/g,""),e.toLowerCase()];for(const n of o)for(const a of t){const i=a.querySelector(".XestroBoxTitle");if((i?.textContent?.toLowerCase()||"").includes(n.toLowerCase()))return console.log(`✅ Found XestroBox with partial match: "${i?.textContent}" for "${e}"`),a}return console.log(`❌ No XestroBox found for title: "${e}"`),null}async saveNote(){console.log("💾 Attempting to save note...");const e=document.getElementById("patientNotesSave")||document.querySelector('button[title*="Save"]')||document.querySelector('button:contains("Save")');if(e){e.click(),console.log("💾 Note saved via button");return}const t=document.getElementById("AddNoteArea");if(t){const o=new KeyboardEvent("keydown",{key:"Enter",shiftKey:!0,bubbles:!0});t.dispatchEvent(o),console.log("💾 Note saved via Shift+Enter");return}console.log("❌ No save method available")}async extractCalendarPatients(){if(console.log("📅 Starting calendar patient extraction..."),console.log("📅 Current page URL:",window.location.href),!this.isCalendarPage())throw new Error("Not on a calendar/appointment book page");const e=this.extractAppointmentDate();console.log("📅 Appointment date:",e);const t=document.querySelector("table.appointmentBook");if(!t)throw new Error("Appointment book table not found");const o=this.extractPatientsFromTable(t);return console.log("📅 Extracted patients:",o),{appointmentDate:e,calendarUrl:window.location.href,patients:o,totalCount:o.length}}isCalendarPage(){const e=document.querySelector(".one-appt-book, table.appointmentBook"),t=document.querySelector("input.date.form-control");return!!(e&&t)}extractAppointmentDate(){const e=document.querySelector("input.date.form-control");if(e)return e.value||e.getAttribute("data-value")||"";const t=document.querySelectorAll("[data-date]");for(const o of t){const n=o.getAttribute("data-date");if(n)return n}return new Date().toDateString()}extractPatientsFromTable(e){console.log("📅 Extracting patients from appointment table...");const t=[],o=e.querySelectorAll("tr.appt");return console.log(`📅 Found ${o.length} appointment rows`),o.forEach((n,a)=>{try{const i=n.querySelector("td.Name");if(!i||!i.textContent?.trim())return;const r=this.extractPatientFromRow(n);if(r){const s=this.validatePatientPattern(r);s.isValid?(t.push(r),console.log(`📅 ✅ Extracted patient ${a+1} (${s.patternType}):`,r)):(console.warn(`📅 ⚠️ Patient ${a+1} has invalid pattern:`,{patient:r,reason:s.reason}),t.push({...r,_patternType:"legacy"}))}}catch(i){console.warn(`📅 Failed to extract patient from row ${a}:`,i)}}),console.log(`📅 Successfully extracted ${t.length} patients from appointment table`),t}extractPatientFromRow(e){const o=e.querySelector("td.Time")?.textContent?.trim()||"",a=e.querySelector("td.Type")?.textContent?.trim()||"",i=e.querySelector("td.Name");if(!i)return null;const r=this.parsePatientNameCell(i);if(!r)return null;const s=e.querySelector("td.Confirm"),c=this.isAppointmentConfirmed(s),l=i.querySelector(".fa-star")!==null,u=e.querySelector("td.Notes")?.textContent?.trim()||"";return{name:r.name,dob:r.dob,fileNumber:r.fileNumber,appointmentTime:o,appointmentType:a,confirmed:c,isFirstAppointment:l,notes:u||void 0}}parsePatientNameCell(e){const t=e.querySelector("span[aria-label]");if(!t)return null;const o=t.getAttribute("aria-label")||"",n=t.textContent?.trim()||"";console.log("📅 Parsing patient name cell:",{ariaLabel:o,displayName:n});const a=n.match(/^(.+?)\s*\((\d+)\)$/);if(a){const r=a[1].trim(),s=a[2];console.log("📅 Found Name (ID) pattern:",{fullName:r,patientId:s});const c=o.match(/\((\d{2}\/\d{2}\/\d{4})\)/),l=c?c[1]:"";return{name:r,dob:l,fileNumber:s}}const i=o.match(/^(.+?)\s*\((\d{2}\/\d{2}\/\d{4})\)$/);if(i){console.log("📅 Using legacy DOB pattern as fallback");const r=i[1].trim(),s=i[2],d=(e.querySelector("small")?.textContent?.trim()||"").replace(/[^\d]/g,"");return{name:r,dob:s,fileNumber:d}}return console.warn("📅 Could not parse patient name from either pattern:",{ariaLabel:o,displayName:n}),null}validatePatientPattern(e){return!e||!e.name||!e.fileNumber?{isValid:!1,patternType:"invalid",reason:"Missing name or fileNumber"}:/^\d+$/.test(e.fileNumber)&&!/\d{2}\/\d{2}\/\d{4}/.test(e.name)?{isValid:!0,patternType:"name-id"}:e.dob&&/\d{2}\/\d{2}\/\d{4}/.test(e.dob)?{isValid:!0,patternType:"legacy-dob"}:{isValid:!1,patternType:"unknown",reason:`Unrecognized pattern: name="${e.name}", fileNumber="${e.fileNumber}", dob="${e.dob}"`}}isAppointmentConfirmed(e){return e?!!e.querySelector(".fa-calendar-check.text-success"):!1}async autoSearchFromHash(){const e=window.location.hash;if(!e.includes("filing="))return;const t=e.match(/filing=([^&]+)/);if(!t)return;const o=decodeURIComponent(t[1]);console.log(`🔍 Hash-based navigation detected for filing: ${o}`);try{await this.searchPatientByFiling(o)}catch(n){console.warn("⚠️ Hash-based search failed:",n)}setTimeout(()=>{window.location.hash.includes(`filing=${encodeURIComponent(o)}`)&&window.history.replaceState(null,"",window.location.pathname)},2e3)}async searchPatientByFiling(e){console.log(`🔍 Searching for patient by filing: ${e}`);const t=document.querySelector("#PatientSelectorInput");if(!t)throw new Error("PatientSelectorInput not found - Xestro may not be ready");t.value=e,t.focus(),t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})),console.log("🔍 Typed filing number, waiting for dropdown..."),await this.wait(200);let o=0,n=!1;for(;o<30;){const a=document.querySelector(".ui-autocomplete"),i=a?.querySelectorAll(".ui-menu-item"),r=i&&i.length>0,s=a&&a.style.display!=="none";if(console.log(`🔍 Autocomplete menu status (attempt ${o+1}/30):`,{menuExists:!!a,itemCount:i?.length||0,isVisible:s,display:a?.style.display}),r&&s){console.log("✅ Autocomplete menu ready with items"),n=!0;break}await this.wait(100),o++}n||console.warn("⚠️ Autocomplete menu did not appear within 3 seconds, proceeding anyway..."),t.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",keyCode:40,code:"ArrowDown",bubbles:!0})),console.log("⬇️ Pressed Down Arrow to select first result"),await this.wait(200),["keydown","keyup","keypress"].forEach(a=>{t.dispatchEvent(new KeyboardEvent(a,{key:"Enter",keyCode:13,code:"Enter",bubbles:!0}))}),console.log("✅ Pressed Enter (keydown/keyup/keypress) - patient navigation should complete")}async navigateToPatient(e,t){console.log(`🧭 Navigating to patient: ${t} (Filing: ${e})`);const o=`#filing=${encodeURIComponent(e)}`;window.location.hash=o,console.log(`✅ Set hash to ${o} - auto-search will trigger`)}async activatePatientByElement(e){console.log(`🖱️ Activating patient by element: ${e}`),console.log(`🖱️ Current page URL: ${window.location.href}`),console.log(`🖱️ Page title: ${document.title}`);let t=null;if(typeof e=="number"){const a=document.querySelector("table.appointmentBook");if(!a){const s=document.querySelectorAll("table"),c=Array.from(s).map(l=>l.className||"no-class");throw console.error("🖱️ table.appointmentBook not found. Available tables:",c),new Error(`Appointment table not found. Expected table.appointmentBook. Found ${s.length} tables: ${c.join(", ")}`)}const i=a.querySelectorAll("tr.appt");console.log(`🖱️ Found ${i.length} appointment rows`);const r=Array.from(i).map(s=>s.querySelector("td.Name")).filter(s=>s&&s.textContent?.trim());if(console.log(`🖱️ Found ${r.length} valid patient elements`),e>=r.length)throw new Error(`Patient index ${e} out of range. Found ${r.length} patients from ${i.length} rows.`);t=r[e],console.log(`🖱️ Found patient element by index ${e}`)}else{if(t=document.querySelector(e),!t)throw new Error(`Patient element not found using selector: ${e}`);console.log(`🖱️ Found patient element by selector: ${e}`)}const o=this.extractPatientInfoFromElement(t);console.log(`🖱️ Activating patient: ${o.name} (${o.fileNumber})`),t.click(),console.log("🖱️ Patient name clicked"),await this.wait(1e3),this.checkPatientActivation(t)?console.log("✅ Patient activation confirmed visually"):console.warn("⚠️ Patient activation not visually confirmed, proceeding anyway"),await this.ensurePatientRecordOpened(),console.log(`✅ Successfully activated patient: ${o.name}`)}extractPatientInfoFromElement(e){const t=e.querySelector("span[aria-label]"),o=e.querySelector("small");if(!t)return{name:"Unknown",dob:"",fileNumber:""};const a=(t.getAttribute("aria-label")||"").match(/^(.+?)\s*\((.+?)\)$/),i=a?a[1].trim():t.textContent?.trim()||"Unknown",r=a?a[2]:"",s=o?.textContent?.replace(/[^\d]/g,"")||"";return{name:i,dob:r,fileNumber:s}}checkPatientActivation(e){const t=e.closest("tr");return t?t.classList.contains("selected")||t.classList.contains("active")||t.style.backgroundColor!==""||t.querySelector(".fa-check")!==null||window.getComputedStyle(t).backgroundColor!=="rgba(0, 0, 0, 0)":!1}async doubleClickPatient(e,t){console.log(`👆 Double-clicking patient: ${e} (ID: ${t})`),console.log(`👆 Current URL: ${window.location.href}`),console.log(`👆 Page title: ${document.title}`);const o=document.querySelector("table.appointmentBook");if(!o)throw new Error("Appointment book table not found. Make sure you are on the appointment calendar page.");const n=o.querySelectorAll("tr.appt");console.log(`👆 Found ${n.length} appointment rows in table`);let a=null;for(const r of Array.from(n)){const s=r.querySelector("td.Name");if(!s)continue;const c=s.querySelector("span[aria-label]");if(!c)continue;const l=c.getAttribute("aria-label")||"",d=c.textContent?.trim()||"",u=l.includes(e)||d.includes(e);if(u){const m=r.textContent||"",p=m.includes(t);if(console.log("👆 Found potential match:",{ariaLabel:l,displayName:d,nameMatches:u,hasFileNumber:p,rowText:m.substring(0,100)}),p||n.length===1){a=c,console.log("👆 Selected patient element in row:",{ariaLabel:l,displayName:d,className:c.className,tagName:c.tagName});break}}}if(!a)throw console.error("👆 ERROR: Patient not found in appointment book"),console.error(`👆 Search criteria: Name="${e}", ID="${t}"`),console.error("👆 Available patients:",Array.from(n).map((r,s)=>{const l=r.querySelector("td.Name")?.querySelector("span[aria-label]");return{index:s,ariaLabel:l?.getAttribute("aria-label"),displayName:l?.textContent?.trim(),rowText:r.textContent?.substring(0,100)}})),new Error(`Patient not found in appointment book: ${e} (${t})`);console.log("👆 Performing double-click on patient element...");const i=new MouseEvent("dblclick",{bubbles:!0,cancelable:!0,view:window});a.dispatchEvent(i),console.log("👆 Double-click event dispatched"),console.log("👆 Waiting 1 second for navigation..."),await this.wait(1e3),console.log(`👆 Double-click completed for patient: ${e}`),console.log(`👆 Post-click URL: ${window.location.href}`),console.log(`👆 Post-click title: ${document.title}`)}async navigateToPatientRecord(){console.log("🏥 Navigating to Patient Record view");const e=this.findButtonByText("Patient Record")||this.findButtonByText("Patient")||document.querySelector('button[title*="Patient Record"]')||document.querySelector('a[href*="patient"]');if(!e)throw new Error("Patient Record button not found in navigation");if(console.log("🏥 Found Patient Record button, clicking..."),e instanceof HTMLElement)e.click();else throw new Error("Patient Record button is not a clickable element");await this.wait(2e3);const t=document.querySelectorAll(".XestroBox").length;t===0&&console.warn("🏥 Patient Record view may not have loaded (no XestroBoxes found)"),console.log(`🏥 Navigation to Patient Record completed (${t} XestroBoxes found)`)}async navigateToAppointmentBook(){console.log("📅 Navigating back to Appointment Book view"),console.log(`📅 Current URL: ${window.location.href}`),console.log(`📅 Page title: ${document.title}`),console.log("📅 Inspecting available navigation elements...");const e=document.querySelectorAll("button");console.log(`📅 All buttons found (${e.length}):`,Array.from(e).map((r,s)=>({index:s,textContent:r.textContent?.trim(),className:r.className,id:r.id,title:r.title,onclick:r.onclick?"has onclick":"no onclick",visible:r.offsetParent!==null})));const t=document.querySelectorAll("a");console.log(`📅 All links found (${t.length}):`,Array.from(t).map((r,s)=>({index:s,textContent:r.textContent?.trim(),href:r.href,className:r.className,id:r.id,title:r.title,visible:r.offsetParent!==null}))),console.log("📅 Searching for navigation buttons...");const o=["Appointment Book","Appointments","Calendar","Dashboard","Home","Back","Close","Return"];let n=null,a="";for(const r of o){console.log(`📅 Searching for pattern: "${r}"`);const s=this.findButtonByText(r);if(s){n=s,a=r,console.log(`📅 Found button with pattern "${r}":`,{textContent:s.textContent?.trim(),className:s.className,id:s.id,tagName:s.tagName});break}}if(!n){console.log("📅 Trying specific selectors...");const r=['button[title*="Appointment"]','a[href*="appointment"]','button[title*="Dashboard"]','a[href*="Dashboard"]','button.btn-default:contains("Back")','button.btn-default:contains("Close")',".navbar-nav a",".nav-tabs a",".breadcrumb a"];for(const s of r)try{const c=document.querySelector(s);c&&(console.log(`📅 Found element with selector "${s}":`,{textContent:c.textContent?.trim(),className:c.className,id:c.id,tagName:c.tagName,href:c.href}),n||(n=c,a=`selector: ${s}`))}catch{}}if(!n)throw console.error("📅 ERROR: No navigation button found"),console.error("📅 DOM inspection complete - no suitable navigation element located"),new Error("Appointment Book button not found in navigation");if(console.log(`📅 Found navigation button with pattern "${a}", clicking...`),n instanceof HTMLElement)n.click(),console.log("📅 Clicked navigation button successfully");else throw console.error("📅 ERROR: Found element is not clickable HTMLElement"),new Error("Appointment Book button is not a clickable element");console.log("📅 Waiting 2 seconds for page transition..."),await this.wait(2e3),console.log("📅 Verifying navigation result..."),console.log(`📅 New URL: ${window.location.href}`),console.log(`📅 New title: ${document.title}`);const i=document.querySelectorAll(".appointmentBook, .one-appt-book, input.date.form-control");console.log(`📅 Calendar elements found: ${i.length}`),i.length===0&&(console.warn("📅 WARNING: Appointment Book view may not have loaded (no calendar elements found)"),console.warn("📅 Current page elements:",{xestroBoxes:document.querySelectorAll(".XestroBox").length,buttons:document.querySelectorAll("button").length,links:document.querySelectorAll("a").length,forms:document.querySelectorAll("form").length})),console.log(`📅 Navigation to Appointment Book completed (${i.length} calendar elements found)`)}async extractPatientFields(){console.log("📋 Extracting patient fields from Patient Record view"),console.log(`📋 Current URL: ${window.location.href}`),console.log(`📋 Page title: ${document.title}`);const e=document.querySelectorAll(".XestroBox").length;if(console.log(`📋 XestroBox count: ${e}`),e===0)throw console.error("📋 ERROR: No XestroBoxes found - not in Patient Record view"),new Error("Not in Patient Record view - no XestroBoxes found");const t=document.querySelectorAll(".XestroBox");console.log("📋 XestroBox details:",Array.from(t).map((r,s)=>({index:s,id:r.id,className:r.className,textContent:r.textContent?.substring(0,100)+"..."}))),console.log("📋 Performing smart empty field detection...");const o=this.detectEmptyFieldsVisually();console.log("📋 Visual field detection results:",o),console.log("📋 Starting optimized field extraction...");const n=await this.extractEMRDataOptimized(["background","investigations","medications","problemList"],o);console.log("📋 Raw extracted data:",{background:{length:n.background?.length||0,preview:n.background?.substring(0,100)||"EMPTY",hasContent:!!n.background?.trim()},investigations:{length:n.investigations?.length||0,preview:n.investigations?.substring(0,100)||"EMPTY",hasContent:!!n.investigations?.trim()},medications:{length:n.medications?.length||0,preview:n.medications?.substring(0,100)||"EMPTY",hasContent:!!n.medications?.trim()},problemList:{length:n.problemList?.length||0,preview:n.problemList?.substring(0,100)||"EMPTY",hasContent:!!n.problemList?.trim()}});const a=[n.background,n.investigations,n.medications,n.problemList].some(r=>r&&r.trim().length>0);console.log(`📋 Data validation: hasAnyData = ${a}`),a||console.warn("📋 WARNING: No meaningful data extracted from any field");const i={background:n.background||"",investigations:n.investigations||"",medications:n.medications||"",problemList:n.problemList||"",extractionTimestamp:Date.now(),xestroBoxCount:e,hasAnyData:a};return console.log("📋 Final extraction result:",i),i}detectEmptyFieldsVisually(){console.log("🔍 Scanning page for empty field visual indicators...");const e={background:!1,investigations:!1,medications:!1,problemList:!1},t=document.querySelectorAll('div[style*="color:#ccc"], div[style*="color: #ccc"], .empty-field, .no-content');return console.log(`🔍 Found ${t.length} potential empty field indicators`),t.forEach((o,n)=>{const a=o.textContent?.toLowerCase()||"";console.log(`🔍 Indicator ${n}: "${a.substring(0,50)}..."`),(a.includes("no background")||a.includes("no history")||a.includes("background summary"))&&(e.background=!0,console.log("🔍 ✅ Background field detected as empty")),(a.includes("no investigation")||a.includes("no results")||a.includes("investigation summary"))&&(e.investigations=!0,console.log("🔍 ✅ Investigations field detected as empty")),(a.includes("no medication")||a.includes("no drugs")||a.includes("medications"))&&(e.medications=!0,console.log("🔍 ✅ Medications field detected as empty")),(a.includes("no problems")||a.includes("no conditions")||a.includes("problem list"))&&(e.problemList=!0,console.log("🔍 ✅ Problem list field detected as empty"))}),e}async extractEMRDataOptimized(e,t){console.log("📋 Starting optimized extraction for fields:",e),console.log("📋 Empty field status:",t);const o={};for(const n of e){const a=n.toLowerCase();if(t[a]){console.log(`⚡ OPTIMIZATION: Skipping empty field "${n}" - detected visually as empty`),o[n]="";continue}console.log(`📋 Extracting content for field: "${n}" (not empty)`);let i="";try{switch(a){case"background":i=await this.extractFieldContent("Background");break;case"investigations":case"investigation-summary":i=await this.extractFieldContent("Investigation Summary");break;case"medications":i=await this.extractFieldContent("Medications (Problem List for Phil)")||await this.extractFieldContent("Medications");break;case"problemlist":i=await this.extractFieldContent("Problem List");break;default:i=await this.extractFieldContent(n)}o[n]=i,console.log(`✅ Extracted ${i.length} characters from ${n}`)}catch(r){console.warn(`⚠️ Failed to extract ${n}:`,r),o[n]=""}}return o}findButtonByText(e){const o=Array.from(document.querySelectorAll("button, a")).find(n=>n.textContent?.trim().toLowerCase().includes(e.toLowerCase())||n.title?.toLowerCase().includes(e.toLowerCase()));return o instanceof HTMLElement?o:null}async findElementWithRetry(e,t=5e3,o=3){for(let n=0;n<o;n++){console.log(`🔄 Attempt ${n+1}/${o} to find element...`);for(const a of e){console.log(`🔍 Trying selector: ${a}`);const i=await this.findElement(a,t/o);if(i)return console.log(`✅ Found element with selector: ${a}`),i}n<o-1&&(console.log(`⏳ Retry ${n+1} failed, waiting before next attempt...`),await this.wait(1e3))}return console.log(`❌ All attempts failed to find element with selectors: ${e.join(", ")}`),null}async findProfilePictureTab(){console.log("🔍 Searching for Profile Picture tab with multiple strategies...");const e=Array.from(document.querySelectorAll('.description, .tab, .tab-item, [role="tab"], .nav-item'));for(const n of e)if(n.textContent?.includes("Profile Picture"))return console.log("✅ Found Profile Picture tab via exact text match"),n;const t=["profile","picture","photo","image","avatar"];for(const n of e){const a=n.textContent?.toLowerCase()||"";if(t.some(i=>a.includes(i)))return console.log(`✅ Found potential Profile Picture tab via text variation: ${n.textContent?.trim()}`),n}const o=document.querySelectorAll('.modal .description, .patient-edit .description, [class*="patient"] .tab');for(const n of o)if(n.textContent?.toLowerCase().includes("profile")||n.textContent?.toLowerCase().includes("picture"))return console.log(`✅ Found Profile Picture tab in modal/patient section: ${n.textContent?.trim()}`),n;return console.log("❌ Could not find Profile Picture tab with any strategy"),null}showErrorMessage(e){const t=document.createElement("div");t.textContent=`⚠️ ${e}`,t.style.cssText=`
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 400px;
      animation: slideInRight 0.3s ease-out;
    `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="slideOutRight 0.3s ease-out",setTimeout(()=>{t.parentNode&&t.parentNode.removeChild(t)},300)},5e3)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{new w}):new w}
