/**
 * Erkennt im Assistenten-Iframe, ob der aktuelle Schritt faktisch abgeschlossen
 * gespeichert wurde (Redirect-Ziel), damit genau ein Weiter-Sprung erfolgt.
 */
export function iframeShowsStepCompletion(stepHref: string, iframeHref: string | null): boolean {
  if (!iframeHref) return false;
  const u = iframeHref;

  if (stepHref.startsWith("/study/fb1")) {
    return (
      u.includes("fromFb1=1") ||
      u.includes("saved=fb1") ||
      u.includes("saved=1") ||
      u.includes("profileSaved=1") ||
      u.includes("afterFb1=1")
    );
  }
  if (stepHref.startsWith("/dashboard")) {
    return u.includes("assistantContinue=fb2");
  }
  if (stepHref.startsWith("/artifacts")) {
    return u.includes("assistantContinue=fb3");
  }
  if (stepHref.startsWith("/decisions")) {
    return u.includes("assistantContinue=fb4");
  }
  if (stepHref.startsWith("/study/info/")) {
    return u.includes("assistantContinue=fb4");
  }
  if (stepHref.startsWith("/profile")) {
    return (
      u.includes("profileSaved=1") ||
      u.includes("assistantContinue=fb2") ||
      u.includes("/dashboard")
    );
  }
  if (stepHref.includes("/study/fb2")) {
    return (
      u.includes("fromFb2=1") || u.includes("saved=fb2") || u.includes("assistantContinue=fb2")
    );
  }
  if (stepHref.includes("/study/fb3")) {
    return (
      u.includes("fromFb3=1") ||
      u.includes("saved=fb3") ||
      u.includes("assistantContinue=fb3")
    );
  }
  if (stepHref.includes("/study/fb4")) {
    return u.includes("saved=fb4") || u.includes("assistantContinue=fb4");
  }
  if (stepHref.startsWith("/study/fb5")) {
    return u.includes("saved=fb5");
  }
  return false;
}
