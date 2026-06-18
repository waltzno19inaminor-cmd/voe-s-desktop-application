const normalizeDateStr = (val) => {
  let str = String(val || '').trim()
  // Replace space with T
  str = str.replace(' ', 'T')
  
  // If it ends with microseconds like .123456Z or .123456, truncate to milliseconds
  str = str.replace(/(\.\d{3})\d+(Z|[\+\-]\d{2}:?\d{2})?$/, '$1$2')
  
  // Append 'Z' to ISO strings missing timezone offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    str += 'Z'
  }
  
  return str
}

