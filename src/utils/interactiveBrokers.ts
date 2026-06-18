import { invoke } from '@tauri-apps/api/core'

export const fetchIbkrFlexXml = async (url: string, params: Record<string, string>): Promise<string> => {
  try {
    const response = await invoke<string>('ibkr_fetch_xml', {
      url,
      params
    })
    return response
  } catch (error: any) {
    throw new Error(typeof error === 'string' ? error : error.message || 'IBKR request failed.')
  }
}

export const getIbkrFlexStatement = async (token: string, queryId: string): Promise<Document> => {
  // Step 1: Send request
  const sendRequestUrl = 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest'
  const sendResponseXml = await fetchIbkrFlexXml(sendRequestUrl, {
    t: token,
    q: queryId,
    v: '3'
  })


  const parser = new DOMParser()
  const sendDoc = parser.parseFromString(sendResponseXml, 'application/xml')

  const status = sendDoc.querySelector('Status')?.textContent
  if (status !== 'Success') {
    const errorCode = sendDoc.querySelector('ErrorCode')?.textContent
    const errorMessage = sendDoc.querySelector('ErrorMessage')?.textContent
    throw new Error(`IBKR Flex Request Failed: ${errorMessage} (Code: ${errorCode})`)
  }

  const referenceCode = sendDoc.querySelector('ReferenceCode')?.textContent
  const getStatementUrl = sendDoc.querySelector('Url')?.textContent
  
  if (!referenceCode || !getStatementUrl) {
    throw new Error('IBKR Flex Request succeeded but returned invalid ReferenceCode or Url.')
  }

  // Step 2: Poll for statement
  let attempts = 0
  const maxAttempts = 12 // Polling up to 60 seconds
  
  while (attempts < maxAttempts) {
    attempts++
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const statementXml = await fetchIbkrFlexXml(getStatementUrl, {
        q: referenceCode,
        t: token,
        v: '3'
      })


      const statementDoc = parser.parseFromString(statementXml, 'application/xml')
      
      // Check if it's an error response (like statement not ready)
      const errStatus = statementDoc.querySelector('Status')?.textContent
      if (errStatus === 'Warn' || errStatus === 'Error') {
         const code = statementDoc.querySelector('ErrorCode')?.textContent
         // 1019: Statement is not available.
         // 1009: Statement generation in progress.
         if (code === '1019' || code === '1009') {
           continue
         }
         const msg = statementDoc.querySelector('ErrorMessage')?.textContent
         throw new Error(`IBKR Flex Statement Error: ${msg} (Code: ${code})`)
      }

      // If we have a FlexQueryResponse, it's successful
      if (statementDoc.querySelector('FlexQueryResponse')) {
        return statementDoc
      }
    } catch (err: any) {
      if (err.message?.includes('1019') || err.message?.includes('1009')) {
        continue
      }
      throw err
    }
  }

  throw new Error('Timeout waiting for IBKR Flex Statement.')
}
