"use client"

import * as React from "react"

export type ColorTheme = "default" | "clean" | "pastel" | "sunday"

interface ColorThemeContextType {
    colorTheme: ColorTheme
    setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeContext = React.createContext<ColorThemeContextType | undefined>(undefined)

export function ColorThemeProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [colorTheme, setColorTheme] = React.useState<ColorTheme>("default")

    React.useEffect(() => {
        const savedTheme = localStorage.getItem("nozzle-color-theme") as ColorTheme
        if (savedTheme) {
            setColorTheme(savedTheme)
            applyTheme(savedTheme)
        }
    }, [])

    const applyTheme = (theme: ColorTheme) => {
        const root = window.document.documentElement

        if (theme === "default") {
            root.removeAttribute("data-color-theme")
        } else {
            root.setAttribute("data-color-theme", theme)
        }
    }

    const handleSetColorTheme = (theme: ColorTheme) => {
        setColorTheme(theme)
        localStorage.setItem("nozzle-color-theme", theme)
        applyTheme(theme)
    }

    return (
        <ColorThemeContext.Provider value={{ colorTheme, setColorTheme: handleSetColorTheme }}>
            {children}
        </ColorThemeContext.Provider>
    )
}

export function useColorTheme() {
    const context = React.useContext(ColorThemeContext)
    if (context === undefined) {
        throw new Error("useColorTheme must be used within a ColorThemeProvider")
    }
    return context
}
