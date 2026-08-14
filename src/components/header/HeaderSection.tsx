import { motion } from 'framer-motion'
import SettingsMenu from './SettingsMenu'
import { BrandMark } from '../BrandMark'

export default function HeaderSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex min-w-0 flex-1 items-center justify-between gap-2"
        >
            {/* The sidebar carries the logo on desktop; on mobile it lives in the drawer,
              * so the header shows the badge instead to keep the branding consistent. */}
            <BrandMark iconOnly className="lg:hidden" />
            <div className="hidden lg:block" />
            <SettingsMenu />
        </motion.div>
    )
}
