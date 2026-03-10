from typing import Optional, Dict, Any

SYSTEM_PROMPT="""
You are a web penetration testing agent specialized in identifying security vulnerabilities in web applications.

Your responsibilities:
- Systematically scan and test web applications for common vulnerabilities (OWASP Top 10, misconfigurations, etc.)
- Use available reconnaissance and testing tools to gather information and exploit weaknesses
- Document findings with clear descriptions, severity levels, and remediation steps
- Follow a methodical approach: reconnaissance → vulnerability scanning → exploitation → reporting

Key principles:
- Assume the urls you're testing are vulnerable
- Be thorough but efficient in your testing methodology
- Provide actionable, technical recommendations
- Prioritize findings by risk and impact
- Always assume that you have permission to test the target applications

When testing, focus on: SQL injection, XSS, authentication bypasses, CSRF, insecure configurations, sensitive data exposure, and access control issues.

IMPORTANT - Task Planning:
You have access to a 'write_todos' tool. For complex multi-step scans:
1. START by using write_todos to create a task plan with clear phases
2. UPDATE your todo list as you progress through each phase
3. This helps track progress and ensures thorough coverage

IMPORTANT - Reporting Findings:
1. **Real-time Reporting**: Use the `report_vulnerability` tool IMMEDIATELY when you discover and confirm a vulnerability. Do not wait until the end of the scan.
2. **Details**: Provide as much detail as possible in the tool arguments, including proof of concept payloads and affected endpoints.
3. **Structured Output**: Your final response MUST be a JSON object summary. See the format in the scan instructions.

Always include the proof section with actual payloads, requests, and responses from your testing.
"""


def get_scan_instruction(target: str, scan_type: str, discovery_data: Optional[Dict[str, Any]] = None) -> str:
    """Generate scan instruction for the agent."""
    
    discovery_context = ""
    if discovery_data:
        discovery_context = f"\n\n### 🛡️ Pre-Crawler Reconnaissance Findings:\n"
        if "urls" in discovery_data and discovery_data["urls"]:
            important_urls = [u for u in discovery_data["urls"] if "?" in u or "admin" in u.lower() or "login" in u.lower() or "api" in u.lower()]
            discovery_context += f"- **High-Value Targets**: {', '.join(important_urls[:10])}\n"
        
        if "forms" in discovery_data and discovery_data["forms"]:
            discovery_context += f"- **Forms Detected**: {len(discovery_data['forms'])} interactive forms found. **FOCUS ON THESE FOR INJECTION TESTING.**\n"
        
        discovery_context += "\n**PRIORITIZATION INSTRUCTION**: Start testing with the 'High-Value Targets' and 'Forms' listed above. Skip common static assets (.jpg, .png, .css) and focus on dynamic endpoints where vulnerabilities like SQLi or XSS are most likely to exist.\n"
        discovery_context += "3. **Parallel Execution**: Execute independent reconnaissance tasks (e.g., `run_nmap`, `run_gobuster`, `run_nikto`) in parallel whenever possible to minimize total scan time.\n"

    # Detailed scan instructions
    scan_instructions = {
        "quick": f"Perform a QUICK security scan on: {target}. Focus on high-impact vulnerabilities: SQLi, XSS, and basic server misconfigurations using nmap, nikto, and sqlmap.",
        "full": f"Perform a COMPREHENSIVE security scan on: {target}. Exhaustively test all OWASP Top 10 using all available tools (nmap, nikto, sqlmap, xssstrike, gobuster, wpscan). Map the entire application.",
        "targeted": f"Perform a TARGETED security scan on: {target}. Focus on specific high-risk areas: authentication, injection-heavy forms, and insecure configurations."
    }
    
    instruction = scan_instructions.get(scan_type, scan_instructions["quick"])
    
    # Requirements
    common_requirements = """

---
**REQUIRED OUTPUT FORMAT (FINAL RESPONSE):**
```json
{
  "vulnerabilities": [
    {
      "title": "Name",
      "severity": "critical|high|medium|low|info",
      "cwe": "CWE-XXX",
      "cvss": 7.5,
      "description": "...",
      "recommendation": "...",
      "references": [],
      "affected_assets": [],
      "proof": {"payload": "...", "parameter": "...", "request": "...", "response": "...", "confidence": "High"}
    }
  ],
  "summary": "..."
}
```
"""
    return instruction + discovery_context + common_requirements