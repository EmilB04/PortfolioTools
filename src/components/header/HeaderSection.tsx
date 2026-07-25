import { motion } from 'framer-motion'
import SettingsMenu from './SettingsMenu'

export default function HeaderSection() {
    return (
        <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            <div className="mx-auto flex w-full max-w-screen-xl items-center justify-end px-6 py-4">
                <SettingsMenu />
            </div>
        </motion.header>
    )
}
