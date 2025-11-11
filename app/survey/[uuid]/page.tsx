'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';
import { saveParticipant, saveParticipantToSupabase, getParticipantFromSupabase } from '../../../lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, GraduationCap, Hand, Calendar, Users, MessageCircle, RotateCcw } from 'lucide-react';
import type { TonePreference, MotivationStyle, EvaluationFocus, ParticipantRow } from '@/types';

interface SurveyFormData {
    // 基本情報
    name: string;
    studentId: string;
    handedness: 'right' | 'left' | 'other' | '';
    age: string;
    gender: 'male' | 'female' | 'other' | '';

    // パーソナライゼーション情報
    nickname: string;
    preferredPraise: string[];
    tonePreference: TonePreference | '';
    motivationStyle: MotivationStyle | '';
    evaluationFocus: EvaluationFocus | '';
}

const createEmptyFormData = (): SurveyFormData => ({
    name: '',
    studentId: '',
    handedness: '',
    age: '',
    gender: '',
    nickname: '',
    preferredPraise: [],
    tonePreference: '',
    motivationStyle: '',
    evaluationFocus: '',
});

// 褒め方の選択肢
const PRAISE_OPTIONS = {
    ja: [
        { id: 'casual-friendly', label: 'フレンドリーに「いい感じ！」と言われたい' },
        { id: 'gentle-soft', label: 'やさしく「大丈夫だよ」と声をかけてほしい' },
        { id: 'formal-solid', label: '落ち着いた丁寧な言葉で評価してほしい' },
        { id: 'growth-focus', label: '前回より成長した点を具体的に褒めてほしい' },
        { id: 'social-focus', label: '平均より頑張れている点を伝えてほしい' },
        { id: 'positive-focus', label: '良かった部分だけをシンプルに褒めてほしい' },
    ],
    en: [
        { id: 'casual-friendly', label: 'Casual “Nice job!” praise feels best' },
        { id: 'gentle-soft', label: 'I like gentle reminders like “You’re doing fine”' },
        { id: 'formal-solid', label: 'Prefer calm, polite acknowledgement' },
        { id: 'growth-focus', label: 'Please highlight how I improved from before' },
        { id: 'social-focus', label: 'Tell me when I’m doing better than average' },
        { id: 'positive-focus', label: 'Just point out the good moments simply' },
    ]
};

const TONE_OPTIONS = {
    ja: [
        {
            value: 'casual' as TonePreference,
            title: '友達みたいに気軽に！',
            description: '例：「いい感じだね〜！」「ナイス！」'
        },
        {
            value: 'gentle' as TonePreference,
            title: '少し丁寧でやさしく',
            description: '例：「いいペースですね」「落ち着いていきましょう」'
        },
        {
            value: 'formal' as TonePreference,
            title: 'しっかり丁寧に',
            description: '例：「非常に良い反応です」「引き続き頑張ってください」'
        }
    ],
    en: [
        {
            value: 'casual' as TonePreference,
            title: 'Friendly & casual',
            description: 'e.g., “Looking great!” “Nice!”'
        },
        {
            value: 'gentle' as TonePreference,
            title: 'Polite but soft',
            description: 'e.g., “Good pace so far” “Let’s stay calm”'
        },
        {
            value: 'formal' as TonePreference,
            title: 'Formal & respectful',
            description: 'e.g., “Excellent responses” “Please keep it up”'
        }
    ]
};

const MOTIVATION_OPTIONS = {
    ja: [
        {
            value: 'empathetic' as MotivationStyle,
            title: 'やさしく共感してほしい',
            description: '例：「大丈夫、焦らなくていいよ」'
        },
        {
            value: 'cheerleader' as MotivationStyle,
            title: '熱く応援してほしい',
            description: '例：「その調子！絶対いける！」'
        },
        {
            value: 'advisor' as MotivationStyle,
            title: '落ち着いたアドバイスが欲しい',
            description: '例：「一度深呼吸してリズムを整えよう」'
        }
    ],
    en: [
        {
            value: 'empathetic' as MotivationStyle,
            title: 'Gentle empathy',
            description: 'e.g., “It’s okay, no rush.”'
        },
        {
            value: 'cheerleader' as MotivationStyle,
            title: 'Hype me up!',
            description: 'e.g., “You got this! Keep pushing!”'
        },
        {
            value: 'advisor' as MotivationStyle,
            title: 'Calm advice',
            description: 'e.g., “Take a breath and find your rhythm.”'
        }
    ]
};

const EVALUATION_OPTIONS = {
    ja: [
        {
            value: 'self-progress' as EvaluationFocus,
            title: '過去の自分と比べたい',
            description: '「前回より速くなったよ！」など'
        },
        {
            value: 'social-comparison' as EvaluationFocus,
            title: '平均より上だと嬉しい',
            description: '「上位◯%のスピードです」など'
        },
        {
            value: 'positive-focus' as EvaluationFocus,
            title: '良かった部分をシンプルに',
            description: 'ポジティブな点のみ伝えてほしい'
        }
    ],
    en: [
        {
            value: 'self-progress' as EvaluationFocus,
            title: 'Compare with my past self',
            description: 'e.g., “Faster than your last block!”'
        },
        {
            value: 'social-comparison' as EvaluationFocus,
            title: 'Compare with others',
            description: 'e.g., “Above average speed!”'
        },
        {
            value: 'positive-focus' as EvaluationFocus,
            title: 'Highlight positives only',
            description: 'Keep it simple and upbeat'
        }
    ]
};

interface SurveyContentProps {
    uuid: string;
}

function SurveyContent({ uuid }: SurveyContentProps) {
    const { language, t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const condition = (searchParams.get('condition') as 'static' | 'personalized') || 'static';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<SurveyFormData>(() => createEmptyFormData());

    const [errors, setErrors] = useState<Partial<Record<keyof SurveyFormData, string>>>({});
    const [existingParticipant, setExistingParticipant] = useState<ParticipantRow | null>(null);
    const [showForm, setShowForm] = useState(true);
    const [isCheckingProfile, setIsCheckingProfile] = useState(true);

    const praiseOptions = PRAISE_OPTIONS[language as 'ja' | 'en'] || PRAISE_OPTIONS.ja;
    const toneOptions = TONE_OPTIONS[language as 'ja' | 'en'] || TONE_OPTIONS.ja;
    const motivationOptions = MOTIVATION_OPTIONS[language as 'ja' | 'en'] || MOTIVATION_OPTIONS.ja;
    const evaluationOptions = EVALUATION_OPTIONS[language as 'ja' | 'en'] || EVALUATION_OPTIONS.ja;
    const genderLabels = language === 'ja'
        ? { male: '男性', female: '女性', other: 'その他' }
        : { male: 'Male', female: 'Female', other: 'Other' };
    const savingLabel = language === 'ja' ? '保存中...' : 'Saving...';
    const multiSelectNote = language === 'ja' ? '（複数選択可）' : '(Multiple selections)';
    const selectedLabel = language === 'ja' ? '選択済み' : 'Selected';
    const selectionCountSuffix = language === 'ja' ? '個' : '';
    const selectedChipLabel = language === 'ja' ? '選択中' : 'Selected';
    const checkingLabel = language === 'ja' ? 'プロフィールを確認しています...' : 'Checking existing profile...';
    const continueLabel = language === 'ja' ? 'この情報で続行' : 'Continue with this profile';
    const updateLabel = language === 'ja' ? '回答を更新する' : 'Update responses';
    const surveyCopy = useMemo(() => ({
        existingTitle: language === 'ja' ? '事前ヒアリング済み' : 'Profile already completed',
        existingDescription: language === 'ja'
            ? '以前の回答が見つかりました。この情報を再利用するか、更新してください。'
            : 'We found your previous responses. You can reuse them or update your answers.',
        summaryLabels: {
            name: language === 'ja' ? '名前' : 'Name',
            nickname: language === 'ja' ? 'ニックネーム' : 'Nickname',
            handedness: language === 'ja' ? '利き手' : 'Handedness',
            gender: language === 'ja' ? '性別' : 'Gender',
            praise: language === 'ja' ? '好きな褒め方' : 'Preferred praise'
        },
        basicInfoTitle: language === 'ja' ? '基本情報' : 'Basic information',
        nameLabel: language === 'ja' ? '名前 *' : 'Name *',
        namePlaceholder: language === 'ja' ? '山田太郎' : 'Alex Johnson',
        studentIdLabel: language === 'ja' ? '学籍番号 *' : 'Student ID *',
        studentIdPlaceholder: language === 'ja' ? 'B1234567' : 'e.g., B1234567',
        handednessLabel: language === 'ja' ? '利き手 *' : 'Handedness *',
        handednessOptions: {
            right: language === 'ja' ? '右利き' : 'Right-handed',
            left: language === 'ja' ? '左利き' : 'Left-handed',
            other: language === 'ja' ? 'その他・回答しない' : 'Other / Prefer not to say'
        },
        ageLabel: language === 'ja' ? '年齢 *' : 'Age *',
        agePlaceholder: language === 'ja' ? '20' : '20',
        genderLabel: language === 'ja' ? '性別 *' : 'Gender *',
        personalizationTitle: language === 'ja' ? 'パーソナライゼーション設定' : 'Personalization settings',
        personalizationSubtitle: language === 'ja'
            ? '実験中に表示されるフィードバックをあなた好みにカスタマイズします'
            : 'Customize how feedback sounds during the experiment.',
        clearButtonLabel: language === 'ja' ? '入力内容をクリア' : 'Clear form',
        clearDialogTitle: language === 'ja' ? 'フォームを初期化しますか？' : 'Reset the form?',
        clearDialogDescription: language === 'ja'
            ? 'フォームに入力したすべての項目を初期化する'
            : 'This will clear every field you have filled out.',
        clearDialogConfirm: language === 'ja' ? '初期化する' : 'Reset now',
        clearDialogCancel: language === 'ja' ? 'キャンセル' : 'Cancel',
        requiredFootnote: language === 'ja' ? '* 必須項目' : '* Required field',
        privacyFootnote: language === 'ja'
            ? 'この情報は研究目的にのみ使用され、個人情報は厳格に保護されます'
            : 'Information is used only for research, and personal data remains protected.'
    }), [language]);

    useEffect(() => {
        const fetchExistingProfile = async () => {
            try {
                const record = await getParticipantFromSupabase(uuid);
                if (record && record.name) {
                    setExistingParticipant(record as ParticipantRow);
                    setFormData({
                        name: record.name ?? '',
                        studentId: record.student_id ?? '',
                        handedness: (record.handedness as SurveyFormData['handedness']) || '',
                        age: record.age ? String(record.age) : '',
                        gender: (record.gender as SurveyFormData['gender']) || '',
                        nickname: record.nickname ?? '',
                        preferredPraise: record.preferred_praise
                            ? record.preferred_praise
                                .split(',')
                                .map((item: string) => item.trim())
                                .filter(Boolean)
                            : [],
                        tonePreference: (record.tone_preference as TonePreference) || '',
                        motivationStyle: (record.motivation_style as MotivationStyle) || '',
                        evaluationFocus: (record.evaluation_focus as EvaluationFocus) || '',
                    });
                    setShowForm(false);
                }
            } catch (error) {
                console.info('No remote profile found for participant', uuid, error);
            } finally {
                setIsCheckingProfile(false);
            }
        };

        fetchExistingProfile();
    }, [uuid]);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof SurveyFormData, string>> = {};

        if (!formData.name.trim()) {
            newErrors.name = language === 'ja' ? '名前を入力してください' : 'Please enter your name';
        }

        if (!formData.studentId.trim()) {
            newErrors.studentId = language === 'ja' ? '学籍番号を入力してください' : 'Please enter your student ID';
        }

        if (!formData.handedness) {
            newErrors.handedness = language === 'ja' ? '利き手を選択してください' : 'Please select your handedness';
        }

        if (!formData.age.trim()) {
            newErrors.age = language === 'ja' ? '年齢を入力してください' : 'Please enter your age';
        } else if (isNaN(Number(formData.age)) || Number(formData.age) < 1 || Number(formData.age) > 150) {
            newErrors.age = language === 'ja' ? '有効な年齢を入力してください' : 'Please enter a valid age';
        }

        if (!formData.gender) {
            newErrors.gender = language === 'ja' ? '性別を選択してください' : 'Please select your gender';
        }

        if (!formData.nickname.trim()) {
            newErrors.nickname = language === 'ja' ? 'ニックネームを入力してください' : 'Please enter a nickname';
        }

        if (formData.preferredPraise.length === 0) {
            newErrors.preferredPraise = language === 'ja' ? '好きな褒め方を1つ以上選択してください' : 'Please select at least one preferred praise style';
        }

        if (!formData.tonePreference) {
            newErrors.tonePreference = language === 'ja' ? '口調タイプを選択してください' : 'Please select a tone preference';
        }

        if (!formData.motivationStyle) {
            newErrors.motivationStyle = language === 'ja' ? '励まし方を選択してください' : 'Please select a motivation style';
        }

        if (!formData.evaluationFocus) {
            newErrors.evaluationFocus = language === 'ja' ? '評価のされ方を選択してください' : 'Please choose an evaluation focus';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            // 参加者情報を保存
            const participantData = {
                id: uuid,
                name: formData.name.trim(),
                studentId: formData.studentId.trim(),
                handedness: formData.handedness,
                age: Number(formData.age),
                gender: formData.gender,
                nickname: formData.nickname.trim(),
                preferredPraise: formData.preferredPraise.join(', '),
                tonePreference: formData.tonePreference as TonePreference,
                motivationStyle: formData.motivationStyle as MotivationStyle,
                evaluationFocus: formData.evaluationFocus as EvaluationFocus,
                language,
                createdAt: new Date(),
            };

            await saveParticipant(participantData);
            await saveParticipantToSupabase(participantData);

            // ローカルストレージにも保存
            localStorage.setItem(`participant-${uuid}`, JSON.stringify(participantData));

            // 少し待ってから注意事項ページに遷移
            setTimeout(() => {
                router.push(`/instructions/${uuid}?condition=${condition}`);
            }, 500);

        } catch (error) {
            console.error('Failed to save participant data:', error);
            setIsSubmitting(false);
            // エラーハンドリング
            alert(language === 'ja' ? 'データの保存に失敗しました。もう一度お試しください。' : 'Failed to save data. Please try again.');
        }
    };

    const proceedWithExistingProfile = () => {
        router.push(`/instructions/${uuid}?condition=${condition}`);
    };

    const handleResetForm = () => {
        setFormData(createEmptyFormData());
        setErrors({});
    };

    const handleInputChange = (field: keyof SurveyFormData, value: string | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // エラーをクリア
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const togglePraiseOption = (optionId: string) => {
        const option = praiseOptions.find(p => p.id === optionId);
        if (!option) return;

        setFormData(prev => {
            const isSelected = prev.preferredPraise.includes(option.label);
            if (isSelected) {
                return {
                    ...prev,
                    preferredPraise: prev.preferredPraise.filter(p => p !== option.label)
                };
            } else {
                return {
                    ...prev,
                    preferredPraise: [...prev.preferredPraise, option.label]
                };
            }
        });
    };

    const renderQuestionHeading = (
        numberLabel: string,
        title: string,
        description: string,
        accentClass: string
    ) => (
        <div className="space-y-1">
            <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${accentClass}`}>
                    {numberLabel}
                </span>
                <span className="text-xl font-semibold text-foreground">{title}</span>
            </div>
            <p className="text-sm text-muted-foreground pl-12">{description}</p>
        </div>
    );

    if (isCheckingProfile) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
                <div className="max-w-3xl w-full">
                    <Card>
                        <CardContent className="p-8 text-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="text-muted-foreground">{checkingLabel}</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    if (existingParticipant && !showForm) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
                <div className="max-w-3xl w-full space-y-6">
                    <Card>
                        <CardHeader className="text-center space-y-3">
                            <CardTitle className="text-3xl">{surveyCopy.existingTitle}</CardTitle>
                            <CardDescription>
                                {surveyCopy.existingDescription}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">{surveyCopy.summaryLabels.name}</p>
                                    <p className="font-semibold">{existingParticipant.name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{surveyCopy.summaryLabels.nickname}</p>
                                    <p className="font-semibold">{existingParticipant.nickname || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{surveyCopy.summaryLabels.handedness}</p>
                                    <p className="font-semibold">{existingParticipant.handedness || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{surveyCopy.summaryLabels.gender}</p>
                                    <p className="font-semibold">{existingParticipant.gender || '-'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-sm text-muted-foreground">{surveyCopy.summaryLabels.praise}</p>
                                    <p className="font-semibold break-words">{existingParticipant.preferred_praise || '-'}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button className="flex-1" onClick={proceedWithExistingProfile}>
                                    {continueLabel}
                                </Button>
                                <Button className="flex-1" variant="outline" onClick={() => setShowForm(true)}>
                                    {updateLabel}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
            <div className="max-w-4xl w-full space-y-8">
                <Card>
                    <CardHeader className="text-center relative">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={isSubmitting}
                                    className="absolute right-4 top-4 h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                    {surveyCopy.clearButtonLabel}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{surveyCopy.clearDialogTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {surveyCopy.clearDialogDescription}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{surveyCopy.clearDialogCancel}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetForm}>
                                        {surveyCopy.clearDialogConfirm}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <CardTitle className="text-3xl">{t.survey.title}</CardTitle>
                        <CardDescription className="text-lg">
                            {t.survey.subtitle}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* 基本情報セクション */}
                            <Card className="border-blue-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-xl">
                                        <User className="mr-2 h-5 w-5" />
                                        {surveyCopy.basicInfoTitle}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">

                                    {/* 名前 */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name">{surveyCopy.nameLabel}</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder={surveyCopy.namePlaceholder}
                                            disabled={isSubmitting}
                                            className={errors.name ? 'border-red-500' : ''}
                                        />
                                        {errors.name && (
                                            <p className="text-sm text-red-600">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* 学籍番号 */}
                                    <div className="space-y-2">
                                        <Label htmlFor="studentId" className="flex items-center">
                                            <GraduationCap className="mr-1 h-4 w-4" />
                                            {surveyCopy.studentIdLabel}
                                        </Label>
                                        <Input
                                            id="studentId"
                                            value={formData.studentId}
                                            onChange={(e) => handleInputChange('studentId', e.target.value)}
                                            placeholder={surveyCopy.studentIdPlaceholder}
                                            disabled={isSubmitting}
                                            className={errors.studentId ? 'border-red-500' : ''}
                                        />
                                        {errors.studentId && (
                                            <p className="text-sm text-red-600">{errors.studentId}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* 利き手 */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center">
                                                <Hand className="mr-1 h-4 w-4" />
                                                {surveyCopy.handednessLabel}
                                            </Label>
                                            <RadioGroup
                                                value={formData.handedness}
                                                onValueChange={(value) => handleInputChange('handedness', value)}
                                                disabled={isSubmitting}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="right" id="right" />
                                                    <Label htmlFor="right">{surveyCopy.handednessOptions.right}</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="left" id="left" />
                                                    <Label htmlFor="left">{surveyCopy.handednessOptions.left}</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="other" id="handedness-other" />
                                                    <Label htmlFor="handedness-other">{surveyCopy.handednessOptions.other}</Label>
                                                </div>
                                            </RadioGroup>
                                            {errors.handedness && (
                                                <p className="text-sm text-red-600">{errors.handedness}</p>
                                            )}
                                        </div>

                                        {/* 年齢 */}
                                        <div className="space-y-2">
                                        <Label htmlFor="age" className="flex items-center">
                                            <Calendar className="mr-1 h-4 w-4" />
                                            {surveyCopy.ageLabel}
                                        </Label>
                                        <Input
                                            id="age"
                                            type="number"
                                            min="1"
                                            max="150"
                                            value={formData.age}
                                            onChange={(e) => handleInputChange('age', e.target.value)}
                                            placeholder={surveyCopy.agePlaceholder}
                                            disabled={isSubmitting}
                                            className={errors.age ? 'border-red-500' : ''}
                                        />
                                        {errors.age && (
                                            <p className="text-sm text-red-600">{errors.age}</p>
                                        )}
                                    </div>
                                    </div>

                                    {/* 性別 */}
                                    <div className="space-y-3">
                                        <Label className="flex items-center">
                                            <Users className="mr-1 h-4 w-4" />
                                            {surveyCopy.genderLabel}
                                        </Label>
                                        <RadioGroup
                                            value={formData.gender}
                                            onValueChange={(value) => handleInputChange('gender', value)}
                                            disabled={isSubmitting}
                                            className="grid gap-3 sm:grid-cols-3"
                                        >
                                            {(['male', 'female', 'other'] as const).map((value) => (
                                                <div
                                                    key={value}
                                                    className={`flex items-center space-x-2 rounded-full border px-4 py-2 ${formData.gender === value
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 bg-white'}`}
                                                >
                                                    <RadioGroupItem value={value} id={`gender-${value}`} />
                                                    <Label htmlFor={`gender-${value}`} className="text-sm font-medium cursor-pointer">
                                                        {genderLabels[value]}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                        {errors.gender && (
                                            <p className="text-sm text-red-600">{errors.gender}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Separator />

                            {/* パーソナライゼーション設定セクション */}
                            <Card className="border-green-200 shadow-[0_10px_40px_rgba(16,185,129,0.15)]">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-2xl font-bold text-green-900">
                                        <MessageCircle className="mr-3 h-6 w-6" />
                                        {surveyCopy.personalizationTitle}
                                    </CardTitle>
                                    <CardDescription className="text-base text-green-900/80">
                                        {surveyCopy.personalizationSubtitle}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">

                                    {/* ニックネーム */}
                                    <div className="space-y-2">
                                        <Label htmlFor="nickname">{t.survey.nickname} *</Label>
                                        <Input
                                            id="nickname"
                                            value={formData.nickname}
                                            onChange={(e) => handleInputChange('nickname', e.target.value)}
                                            placeholder={t.survey.nicknamePlaceholder}
                                            disabled={isSubmitting}
                                            className={errors.nickname ? 'border-red-500' : ''}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t.survey.nicknameHelper}
                                        </p>
                                        {errors.nickname && (
                                            <p className="text-sm text-red-600">{errors.nickname}</p>
                                        )}
                                    </div>

                                    {/* 口調タイプ */}
                                    <div className="space-y-4">
                                        {renderQuestionHeading('01', t.survey.toneQuestionTitle, t.survey.toneQuestionDescription, 'border-blue-300 bg-blue-50 text-blue-900')}
                                        <RadioGroup
                                            value={formData.tonePreference}
                                            onValueChange={(value) => handleInputChange('tonePreference', value)}
                                            disabled={isSubmitting}
                                            className="space-y-3"
                                        >
                                            {toneOptions.map((option) => (
                                                <Label
                                                    key={option.value}
                                                    htmlFor={`tone-${option.value}`}
                                                    className={`flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${formData.tonePreference === option.value
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <RadioGroupItem
                                                        value={option.value}
                                                        id={`tone-${option.value}`}
                                                        className="mt-1"
                                                    />
                                                    <div>
                                                        <span className="font-semibold">{option.title}</span>
                                                        <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                                                    </div>
                                                </Label>
                                            ))}
                                        </RadioGroup>
                                        {errors.tonePreference && (
                                            <p className="text-sm text-red-600">{errors.tonePreference}</p>
                                        )}
                                    </div>

                                    {/* 励ましタイプ */}
                                    <div className="space-y-4">
                                        {renderQuestionHeading('02', t.survey.motivationQuestionTitle, t.survey.motivationQuestionDescription, 'border-emerald-300 bg-emerald-50 text-emerald-900')}
                                        <RadioGroup
                                            value={formData.motivationStyle}
                                            onValueChange={(value) => handleInputChange('motivationStyle', value)}
                                            disabled={isSubmitting}
                                            className="space-y-3"
                                        >
                                            {motivationOptions.map((option) => (
                                                <Label
                                                    key={option.value}
                                                    htmlFor={`motivation-${option.value}`}
                                                    className={`flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${formData.motivationStyle === option.value
                                                        ? 'border-green-500 bg-green-50'
                                                        : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <RadioGroupItem
                                                        value={option.value}
                                                        id={`motivation-${option.value}`}
                                                        className="mt-1"
                                                    />
                                                    <div>
                                                        <span className="font-semibold">{option.title}</span>
                                                        <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                                                    </div>
                                                </Label>
                                            ))}
                                        </RadioGroup>
                                        {errors.motivationStyle && (
                                            <p className="text-sm text-red-600">{errors.motivationStyle}</p>
                                        )}
                                    </div>

                                    {/* 評価タイプ */}
                                    <div className="space-y-4">
                                        {renderQuestionHeading('03', t.survey.evaluationQuestionTitle, t.survey.evaluationQuestionDescription, 'border-purple-300 bg-purple-50 text-purple-900')}
                                        <RadioGroup
                                            value={formData.evaluationFocus}
                                            onValueChange={(value) => handleInputChange('evaluationFocus', value)}
                                            disabled={isSubmitting}
                                            className="space-y-3"
                                        >
                                            {evaluationOptions.map((option) => (
                                                <Label
                                                    key={option.value}
                                                    htmlFor={`evaluation-${option.value}`}
                                                    className={`flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${formData.evaluationFocus === option.value
                                                        ? 'border-purple-500 bg-purple-50'
                                                        : 'border-gray-200 hover:border-gray-300'}`}
                                                >
                                                    <RadioGroupItem
                                                        value={option.value}
                                                        id={`evaluation-${option.value}`}
                                                        className="mt-1"
                                                    />
                                                    <div>
                                                        <span className="font-semibold">{option.title}</span>
                                                        <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                                                    </div>
                                                </Label>
                                            ))}
                                        </RadioGroup>
                                        {errors.evaluationFocus && (
                                            <p className="text-sm text-red-600">{errors.evaluationFocus}</p>
                                        )}
                                    </div>

                                    {/* 好きな褒め方（複数選択可能） */}
                                    <div className="space-y-3">
                                        <Label>{t.survey.preferredPraise} * {multiSelectNote}</Label>
                                        <p className="text-xs text-muted-foreground">{t.survey.preferredPraiseHint}</p>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {praiseOptions.map((option) => (
                                                <div
                                                    key={option.id}
                                                    onClick={() => togglePraiseOption(option.id)}
                                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${formData.preferredPraise.includes(option.label)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm">{option.label}</span>
                                                        {formData.preferredPraise.includes(option.label) && (
                                                            <Badge variant="default" className="ml-2">{selectedChipLabel}</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {formData.preferredPraise.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    {selectedLabel} ({formData.preferredPraise.length}{selectionCountSuffix})
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.preferredPraise.map((praise, index) => (
                                                        <Badge key={index} variant="secondary">
                                                            {praise}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {errors.preferredPraise && (
                                            <p className="text-sm text-red-600">{errors.preferredPraise}</p>
                                        )}
                                    </div>

                                </CardContent>
                            </Card>

                            <div className="flex justify-center pt-6">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    size="lg"
                                    className="px-8"
                                >
                                    {isSubmitting ? savingLabel : t.survey.continue}
                                </Button>
                            </div>

                            <div className="text-center text-xs text-muted-foreground space-y-1">
                                <p>{surveyCopy.requiredFootnote}</p>
                                <p>{surveyCopy.privacyFootnote}</p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

interface SurveyPageProps {
    params: Promise<{
        uuid: string;
    }>;
}

export default function SurveyPage({ params }: SurveyPageProps) {
    const { uuid } = use(params);

    return (
        <LanguageProvider>
            <SurveyContent uuid={uuid} />
        </LanguageProvider>
    );
}
