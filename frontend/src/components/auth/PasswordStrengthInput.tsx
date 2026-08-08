import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { EyeOffIcon, EyeIcon, CheckIcon, XIcon } from 'lucide-react'

interface PasswordStrengthInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  autoComplete?: string
}

export default function PasswordStrengthInput({
  value,
  onChange,
  label = 'Password',
  placeholder = 'Enter your password',
  autoComplete = 'new-password'
}: PasswordStrengthInputProps) {
  const { t } = useTranslation('auth')
  const [isVisible, setIsVisible] = useState(false)

  const toggleVisibility = () => setIsVisible(prevState => !prevState)

  const PASSWORD_REQUIREMENTS = [
    { regex: /.{8,}/, key: 'minChars' },
    { regex: /[A-Z]/, key: 'uppercase' },
    { regex: /[a-z]/, key: 'lowercase' },
    { regex: /[0-9]/, key: 'number' },
    { regex: /[@$!%*?&]/, key: 'special' }
  ]

  const strength = PASSWORD_REQUIREMENTS.map(req => ({
    met: req.regex.test(value),
    text: t(`passwordRequirements.${req.key}`)
  }))

  const strengthScore = useMemo(() => {
    return strength.filter(req => req.met).length
  }, [strength])

  const getColor = (score: number) => {
    if (score === 0) return 'bg-[var(--border)]'
    if (score <= 1) return 'bg-[var(--destructive)]'
    if (score <= 2) return 'bg-orange-500'
    if (score <= 3) return 'bg-amber-500'
    if (score === 4) return 'bg-yellow-400'
    return 'bg-green-500'
  }

  const getText = (score: number) => {
    if (score === 0) return t('passwordRequirements.empty')
    if (score <= 2) return t('passwordRequirements.weak')
    if (score <= 3) return t('passwordRequirements.medium')
    if (score === 4) return t('passwordRequirements.strong')
    return t('passwordRequirements.veryStrong')
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-1.5'>
        <label className='text-sm font-medium text-[var(--foreground)]'>{label}</label>
      </div>
      <div className='relative mb-3'>
        <input
          type={isVisible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          className='peer w-full h-12 pl-4 pr-12 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 outline-none transition-all duration-200 focus:border-[var(--primary)]/40 focus:ring-4 focus:ring-[var(--primary)]/10'
        />
        <button
          type='button'
          onClick={toggleVisibility}
          className='absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors'
          aria-label={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible ? (
            <EyeOffIcon size={18} />
          ) : (
            <EyeIcon size={18} />
          )}
        </button>
      </div>

      <div className='mb-4 flex h-1 w-full gap-1'>
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-full flex-1 rounded-full transition-all duration-500 ease-out',
              index < strengthScore ? getColor(strengthScore) : 'bg-[var(--border)]'
            )}
          />
        ))}
      </div>

      <p className='text-[var(--foreground)] text-sm font-medium mb-2'>
        {getText(strengthScore)}. {t('passwordRequirements.mustContain')}
      </p>

      <ul className='space-y-1.5'>
        {strength.map((req, index) => (
          <li key={index} className='flex items-center gap-2'>
            {req.met ? (
              <CheckIcon className='size-4 text-green-600 dark:text-green-400 flex-shrink-0' />
            ) : (
              <XIcon className='text-[var(--muted-foreground)] size-4 flex-shrink-0' />
            )}
            <span className={cn('text-xs', req.met ? 'text-green-600 dark:text-green-400' : 'text-[var(--muted-foreground)]')}>
              {req.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
