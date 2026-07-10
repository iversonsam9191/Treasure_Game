import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

interface AuthFormValues {
  email: string;
  password: string;
}

type Mode = 'signin' | 'signup';

export function AuthGate() {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AuthFormValues>({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: AuthFormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(values.email, values.password);
      } else {
        await signIn(values.email, values.password);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
    setFormError(null);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800">Sign in to save your scores, or play as a guest.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <Card className="bg-amber-200/80 backdrop-blur-sm border-2 border-amber-400">
          <CardHeader>
            <CardTitle className="text-amber-900">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</CardTitle>
            <CardDescription className="text-amber-700">
              {mode === 'signin'
                ? 'Welcome back, treasure hunter.'
                : 'Create an account to track your score history.'}
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    required: 'Email is required.',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address.',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-amber-900">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  rules={{
                    required: 'Password is required.',
                    minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-amber-900">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {formError && <p className="text-sm text-red-700">{formError}</p>}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Button>
                <Button type="button" variant="link" onClick={toggleMode} className="text-amber-800">
                  {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </Button>
                <div className="w-full flex items-center gap-2 text-amber-600 text-xs">
                  <div className="flex-1 h-px bg-amber-400/60" />
                  or
                  <div className="flex-1 h-px bg-amber-400/60" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={continueAsGuest}
                  className="w-full border-amber-400 text-amber-800 hover:bg-amber-100"
                >
                  Continue as Guest
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </motion.div>
    </div>
  );
}
