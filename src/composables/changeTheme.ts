export const changeTheme = () => {
    isDark.value = !isDark.value    
    if(localStorage.getItem("dark") === 'true') {
        document.documentElement.classList.remove("dark")
        localStorage.setItem("dark", 'false')
    } else {
        document.documentElement.classList.add("dark")
        localStorage.setItem("dark", 'true')
    }
  
}

export const isDark = ref(false);