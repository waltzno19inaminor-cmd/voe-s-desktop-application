use std::collections::BTreeMap;

#[tauri::command]
pub async fn ibkr_fetch_xml(
    url: String,
    params: BTreeMap<String, String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let mut headers = reqwest::header::HeaderMap::new();
    // Some endpoints may require a generic User-Agent
    headers.insert(
        "User-Agent",
        reqwest::header::HeaderValue::from_static("Mozilla/5.0"),
    );

    let response = client
        .get(&url)
        .headers(headers)
        .query(&params)
        .send()
        .await
        .map_err(|err| format!("IBKR network request failed: {}", err))?;

    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|err| format!("IBKR response read failed: {}", err))?;

    if status >= 400 {
        return Err(format!("IBKR request failed ({}) - {}", status, text));
    }

    Ok(text)
}
