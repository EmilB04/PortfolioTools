import { motion } from 'framer-motion'
import LanguageSwitcher from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

export default function HeaderSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4">
                <div className="flex gap-2">
                    <LanguageSwitcher />
                    <ThemeSwitcher />
                </div>
            </div>
        </motion.div>
    )
}
