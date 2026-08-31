export type ProductEnCopy = {
  name: string;
  description: string;
  /** Optional per-SKU feature bullets; otherwise FEATURE_EN phrase map is used. */
  features?: string[];
};

/** English shelf copy keyed by product id. Benefits-only descriptions (no gateway/proxy/API2D/new-api access details). */
export const PRODUCT_EN: Record<string, ProductEnCopy> = {
  "gpt-5.6-sol": {
    name: "GPT-5.6 Sol access",
    description:
      "Strong reasoning and writing for complex briefs, coding help, and long-form work.",
  },
  "qwen-plus": {
    name: "Qwen access",
    description:
      "Reliable Chinese dialogue and everyday productivity for customer service and content tasks.",
  },
  "deepseek-chat": {
    name: "DeepSeek access",
    description:
      "Efficient coding and analytical chat for technical Q&A and problem-solving.",
  },
  "doubao-seed": {
    name: "Doubao access",
    description:
      "Natural Chinese conversation suited to consumer apps and friendly assistant flows.",
  },
  "claude-sonnet": {
    name: "Claude access",
    description:
      "Careful long-context reading and clear writing for docs, analysis, and drafting.",
  },
  "gemini-pro": {
    name: "Gemini access",
    description:
      "Multimodal understanding for mixed text, image, and research-style questions.",
  },
  "grok-chat": {
    name: "Grok access",
    description:
      "Fast, conversational answers with a sharp take on current topics and brainstorming.",
  },
  "ernie-5": {
    name: "ERNIE Bot access",
    description:
      "Solid Chinese understanding for business writing, Q&A, and local market content.",
  },
  "dall-e-3": {
    name: "Wanxiang images",
    description:
      "Generate steady ecommerce heroes, posters, and campaign visuals.",
  },
  "jimeng-image": {
    name: "Jimeng image service",
    description:
      "Generate domestic-creative and ecommerce-style images with a distinct vibe.",
  },
  "stable-diffusion-xl": {
    name: "Brand poster images",
    description:
      "Create controllable brand posters and campaign visuals for fast iteration.",
  },
  "midjourney-api": {
    name: "Midjourney creative service",
    description:
      "Explore concepts and art direction with strong composition and style range.",
  },
  "whisper-api": {
    name: "Meeting transcription service",
    description:
      "Turn meeting audio into searchable text so notes and follow-ups are easier to share.",
  },
  "elevenlabs-tts": {
    name: "Voice and dubbing service",
    description:
      "Natural spoken narration and dubbing for videos, training clips, and product demos.",
  },
  "voice-clone": {
    name: "Voice clone service",
    description:
      "Reproduce a consistent speaker voice for branded narration and repeated content series.",
  },
  "ai-music-bgm": {
    name: "AI soundtrack service",
    description:
      "Generate background music that matches mood and length for ads and short videos.",
  },
  "runway-gen3": {
    name: "Short video generation",
    description:
      "Create short clips from text or stills for social posts and campaign drafts.",
  },
  "kling-video": {
    name: "Kling short video",
    description:
      "Generate cinematic short videos for storytelling and product showcases.",
  },
  "langchain-pro": {
    name: "On-site Agent / knowledge Q&A",
    description:
      "Answer from your own docs so staff and customers get grounded, on-brand replies.",
  },
  "cursor-pro": {
    name: "Dev Q&A / standards capture",
    description:
      "Help engineering teams ask coding questions and keep conventions easy to reuse.",
  },
  "pinecone": {
    name: "On-site knowledge base",
    description:
      "Store and retrieve company knowledge so assistants stay accurate and up to date.",
  },
  "weaviate-cloud": {
    name: "Hybrid retrieval (legacy)",
    description:
      "Combine keyword and semantic search for more precise answers from mixed documents.",
  },
  "openai-assistants": {
    name: "Business assistant setup",
    description:
      "Build task-focused assistants for support, ops, and internal workflows.",
  },
  "replicate-api": {
    name: "Open-source model access",
    description:
      "Run specialized open models for niche vision, audio, and generation needs.",
  },
  "cohere-embed": {
    name: "Retrieval augmentation",
    description:
      "Improve search and RAG quality so answers stay relevant to your corpus.",
  },
  "capcut-auto": {
    name: "Auto editing service",
    description:
      "Speed up cut, pacing, and assembly so draft videos are ready faster.",
  },
  "ai-subtitle": {
    name: "AI subtitles and translation",
    description:
      "Add accurate captions and multilingual subtitles for wider reach.",
  },
  "smart-clip-select": {
    name: "Smart clip / timecode pick",
    description:
      "Find highlight moments and timecodes so editors spend less time scrubbing.",
  },
  "digital-human": {
    name: "Talking-head video (script + voice + cut)",
    description:
      "Turn a script into a ready spoken video with voice and picture in one flow.",
  },
  "ai-image-make": {
    name: "Online image (Wanxiang / Jimeng)",
    description:
      "Generate posters, product shots, and banners quickly for launches and ads.",
  },
  "copy-to-image": {
    name: "Copy to image",
    description:
      "Turn marketing copy into matching posters and visuals without a blank start.",
  },
  "ai-video-gen": {
    name: "Video generation service",
    description:
      "Produce short promotional and explainer videos from briefs and assets.",
  },
  "ai-comic-drama": {
    name: "AI comic / short-drama workflow",
    description:
      "Storyboard and produce comic-style short dramas from scripts and scene plans.",
  },
  "video-replica": {
    name: "Video remake service",
    description:
      "Recreate a reference video’s structure and style for your own product story.",
  },
  "prompt-reverse": {
    name: "Prompt reverse service",
    description:
      "Reverse-engineer reusable prompts from any image for lookalike creation.",
  },
  "ai-workflow": {
    name: "AI workflow service",
    description:
      "Chain image, video, and listing steps into a repeatable creative workflow.",
  },
  "we-media-topics": {
    name: "Creator topic planning",
    description:
      "Track benchmark creators and trending boards to plan one week of shoot-ready topics.",
  },
  "we-media-script": {
    name: "Creator script writing",
    description:
      "Turn topics into platform-ready drafts with hook lines, body copy, and comment replies.",
  },
  "we-media-storyboard": {
    name: "Creator storyboard planning",
    description:
      "Break scripts into shot-by-shot plans with visuals, lines, timing, and props.",
  },
  "we-media-voice": {
    name: "Creator voiceover",
    description:
      "Generate voiceover previews from scripts with pacing notes and optional cloned voice handoff.",
  },
  "we-media-video": {
    name: "Creator video production",
    description:
      "Generate visual assets by storyboard and keep account style consistent through final cuts.",
  },
  "we-media-publish": {
    name: "Creator multi-platform publish pack",
    description:
      "Adapt one draft into platform-specific captions, titles, and publishing checklists.",
  },
  "we-media-review": {
    name: "Creator performance review loop",
    description:
      "Review post metrics and screenshots to extract winning hooks and next-round topic ideas.",
  },
  "ecommerce-image": {
    name: "E-commerce imagery",
    description:
      "Create listing heroes, lifestyle shots, and campaign posters for online stores.",
  },
  "product-replica": {
    name: "Product remake service",
    description:
      "Remake product heroes, scenes, and detail layouts from sample or competitor references.",
  },
  "restaurant-cs": {
    name: "Restaurant review reply drafting",
    description:
      "Draft restaurant-platform review replies in your shop’s tone, ready to send.",
  },
  "menu-optimize": {
    name: "Menu optimization",
    description:
      "Sharpen dish names, selling points, and pricing so menus convert better.",
  },
  "inventory-forecast": {
    name: "Smart restock forecast",
    description:
      "Estimate daily prep volume from sales patterns and holiday demand.",
  },
  "retail-marketing": {
    name: "Restaurant marketing content",
    description:
      "Create dining promo copy and campaign ideas for Moments, Xiaohongshu, and Douyin.",
  },
  "shop-cs": {
    name: "Online store CS drafting",
    description:
      "Draft clear CS replies for inquiries, shipping, and returns with a consistent tone.",
  },
  "shop-listing": {
    name: "Product listing optimization",
    description:
      "Improve titles, selling points, and detail structure for clearer, higher-converting PDPs.",
  },
  "shop-review": {
    name: "E-commerce review reply drafting",
    description:
      "Draft polite, on-brand review replies for ecommerce platforms.",
  },
  "shop-photo-audit": {
    name: "Listing photo check",
    description:
      "Catch typos, mismatched info, and risky wording on hero and detail images.",
  },
  "cross-border-listing": {
    name: "Cross-border listing localization",
    description:
      "Localize titles and bullet points for the target marketplace language and category norms.",
  },
  "cross-border-cs": {
    name: "Cross-border multilingual CS",
    description:
      "Draft multilingual shipping, return, and negative-review replies aligned with shop policy.",
  },
  "contract-photo-review": {
    name: "Contract photo review",
    description:
      "Review photographed contracts for key clauses and risk points before signing.",
  },
  "invoice-photo": {
    name: "Invoice photo recognition",
    description:
      "Extract amounts and fields from invoice photos for faster expense handling.",
  },
  "smart-bookkeeping": {
    name: "Smart bookkeeping",
    description:
      "Organize income and expense entries so small teams keep cleaner books.",
  },
  "business-report": {
    name: "Business monthly report",
    description:
      "Summarize monthly operations into clear highlights for owners and managers.",
  },
  "contract-reminder": {
    name: "Contract expiry reminders",
    description:
      "Track renewals and deadlines so important agreements are not missed.",
  },
  "course-notes": {
    name: "Course notes organizer",
    description:
      "Turn lecture material into structured notes that are easy to review.",
  },
  "homework-grade": {
    name: "Homework photo grading",
    description:
      "Check photographed assignments and give concise feedback for faster review.",
  },
  "enroll-copy": {
    name: "Enrollment copy generation",
    description:
      "Write persuasive admissions and course enrollment copy for campaigns.",
  },
  "resume-screen": {
    name: "Resume screening",
    description:
      "Rank and filter resumes against role criteria to speed hiring shortlists.",
  },
  "interview-questions": {
    name: "Interview question generation",
    description:
      "Create role-specific interview questions covering skills and culture fit.",
  },
  "hr-qa-bot": {
    name: "Employee Q&A assistant",
    description:
      "Answer staff policy and process questions so HR handles fewer repeat asks.",
  },
  "open-resume": {
    name: "Job-seeker resume polish",
    description:
      "Refine resumes for clarity, impact, and better match to target roles.",
  },
  "cover-letter": {
    name: "Cover letter generation",
    description:
      "Write tailored cover letters that highlight fit for each application.",
  },
  "mock-interview": {
    name: "Mock interview practice",
    description:
      "Practice interview answers with realistic prompts and improvement tips.",
  },
  "job-search-agent": {
    name: "Job-search co-pilot",
    description:
      "Stay on track through applications, prep, and follow-ups with guided steps.",
  },
  "ai-summarize": {
    name: "Long-form summary & takeaways",
    description:
      "Compress long documents into key points you can act on quickly.",
  },
  "ai-rewrite": {
    name: "Copy rewrite & polish",
    description:
      "Rewrite the same draft shorter, more professional, or more conversational by platform.",
  },
  "image-matting": {
    name: "Cutout & background swap prompts",
    description:
      "Plan clean cutouts and background swaps for product and portrait reshoots.",
  },
  "image-enhance": {
    name: "Sharpen & upscale prompts",
    description:
      "Prioritize fixes for soft, dark, or compressed images before publishing.",
  },
  "content-moderation": {
    name: "Image & text moderation assist",
    description:
      "Flag risky or policy-sensitive content before it goes live.",
  },
  "image-search": {
    name: "Find similar images & describe",
    description:
      "Break down composition and suggest keywords to find similar references.",
  },
  "table-ocr": {
    name: "Table & form structuring",
    description:
      "Turn photographed tables and forms into structured fields you can reuse.",
  },
  "doc-compare": {
    name: "Contract & version compare",
    description:
      "Highlight differences between document versions so reviews stay thorough.",
  },
  "seal-detect": {
    name: "Seal & signature check assist",
    description:
      "Help verify seals and signatures on scanned paperwork for compliance checks.",
  },
  "meeting-minutes": {
    name: "Meeting minutes in one pass",
    description:
      "Capture decisions, owners, and next steps from meetings into clean minutes.",
  },
  "ppt-deck": {
    name: "Presentation outline service",
    description:
      "Build clear slide outlines so decks start structured and on-message.",
  },
  "sales-leads": {
    name: "Sales lead follow-up",
    description:
      "Write stage-based lead follow-ups that move the next conversation forward.",
  },
  "work-im-bot": {
    name: "WeCom / DingTalk / Feishu bots",
    description:
      "Bring AI answers into team chat so staff get help where they already work.",
  },
  "sheet-analyst": {
    name: "Spreadsheet Q&A",
    description:
      "Ask natural questions over tables to get charts-ready insights without formulas.",
  },
  "gsap-skills": {
    name: "GSAP animation skills setup",
    description:
      "Install official GSAP skills and map timeline and scroll animation patterns to your project.",
  },
  "watermarks-remover": {
    name: "Watermark hygiene workflow",
    description:
      "Clean ownership-safe text artifacts and metadata so outputs are ready for production delivery.",
  },
  "pinecone-avatars": {
    name: "Pinecone Avatars preset picker",
    description:
      "Drop AvatarPicker into signup so users pick SVG presets; coaching for Next/React embed and export.",
  },
  "dicebear": {
    name: "DiceBear generative avatars",
    description:
      "Generate style+seed placeholder avatars via HTTP or npm; coaching for default profile images.",
  },
  "upload-crop-image": {
    name: "Upload & crop avatar field",
    description:
      "Port a Next-friendly crop/zoom/rotate field into registration forms with RHF-ready patterns.",
  },
  "uploadthing": {
    name: "UploadThing file uploads",
    description:
      "Type-safe Next.js upload routes for avatars and attachments; coaching for keys and quotas you host.",
  },
  "supabase-avatar-example": {
    name: "Profile avatar upload example",
    description:
      "Study the official Next user-management avatar flow; reuse storage patterns without swapping your whole auth.",
  },
  "brand-visual": {
    name: "Brand visual & logo direction",
    description:
      "Activate by brand industry and audience—matched models set mood, palette, logo directions, and image prompts; not finished vector files.",
  },
  "poster-layout": {
    name: "Poster layout planning",
    description:
      "Activate with theme and size—matched models plan hierarchy, grid, and copy placement, then image prompts; not finished poster art.",
  },
  "ui-wireframe": {
    name: "UI wireframes & interaction notes",
    description:
      "Activate for product shape and user task—matched models draft IA, wireframe blocks, and key copy; not Figma hi-fi deliverables.",
  },
  "packaging-design": {
    name: "Packaging & collateral concepts",
    description:
      "Activate by category and channel—matched models propose box, label, and shelf concepts with image prompts; no tooling or print fulfillment.",
  },
};

export function productCopyEn(id: string): ProductEnCopy | undefined {
  return PRODUCT_EN[id];
}
