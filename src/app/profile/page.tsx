import { connection } from "next/server";
import { getProfile } from "@/lib/profile";
import { resumeInfo } from "@/lib/resume";
import { COUNTRIES } from "@/lib/geo";
import { SKILLS } from "@/lib/skills/taxonomy";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  await connection();
  const [profile, resume] = await Promise.all([getProfile(), resumeInfo()]);
  const countries = COUNTRIES.map((c) => ({ code: c.code, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-ink-2">Everything here goes into scoring and applications. Saving re-scores every job.</p>
      </header>
      <ProfileForm profile={profile} countries={countries} skillNames={SKILLS.map((s) => s.name)} resume={resume} />
    </div>
  );
}
