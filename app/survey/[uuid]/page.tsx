'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { LanguageProvider, useLanguage } from '../../../lib/i18n';
import { saveParticipant } from '../../../lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, GraduationCap, Hand, Calendar, Users, MessageCircle, X } from 'lucide-react';

interface SurveyFormData {
    // 基本情報
    name: string;
    studentId: string;
    handedness: 'right' | 'left' | 'other' | '';
    age: string;
    gender: 'male' | 'female' | 'other' | 'no-answer' | '';

    // パーソナライゼーション情報
    nickname: string;
    preferredPraise: string[];
    avoidExpressions: string[];
}

// 褒め方の選択肢
const PRAISE_OPTIONS = {
    ja: [
        { id: 'great', label: '「すごい！」「素晴らしい！」' },
        { id: 'good', label: '「いいね！」「良くできました」' },
        { id: 'perfect', label: '「完璧！」「パーフェクト！」' },
        { id: 'amazing', label: '「すばらしい！」「驚きです！」' },
        { id: 'excellent', label: '「優秀！」「エクセレント！」' },
        { id: 'wonderful', label: '「素敵！」「ワンダフル！」' },
        { id: 'awesome', label: '「最高！」「オーサム！」' },
        { id: 'brilliant', label: '「輝いてる！」「ブリリアント！」' },
        { id: 'outstanding', label: '「際立ってる！」「アウトスタンディング！」' },
        { id: 'impressive', label: '「印象的！」「インプレッシブ！」' },
        { id: 'fantastic', label: '「幻想的！」「ファンタスティック！」' },
        { id: 'superb', label: '「上質！」「スーパーブ！」' },
        { id: 'gentle', label: '「よくできたね」「頑張ったね」' },
        { id: 'encouraging', label: '「その調子！」「継続は力なり」' },
        { id: 'friendly', label: '「ナイス！」「グッジョブ！」' },
    ],
    en: [
        { id: 'great', label: 'Great! Wonderful!' },
        { id: 'good', label: 'Good! Well done!' },
        { id: 'perfect', label: 'Perfect! Flawless!' },
        { id: 'amazing', label: 'Amazing! Incredible!' },
        { id: 'excellent', label: 'Excellent! Outstanding!' },
        { id: 'wonderful', label: 'Wonderful! Marvelous!' },
        { id: 'awesome', label: 'Awesome! Fantastic!' },
        { id: 'brilliant', label: 'Brilliant! Genius!' },
        { id: 'outstanding', label: 'Outstanding! Remarkable!' },
        { id: 'impressive', label: 'Impressive! Striking!' },
        { id: 'fantastic', label: 'Fantastic! Fabulous!' },
        { id: 'superb', label: 'Superb! Magnificent!' },
        { id: 'gentle', label: 'Well done! Keep it up!' },
        { id: 'encouraging', label: 'Keep going! You got this!' },
        { id: 'friendly', label: 'Nice! Good job!' },
    ]
};

interface SurveyContentProps {
    uuid: string;
}

function SurveyContent({ uuid }: SurveyContentProps) {
    const { language } = useLanguage();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<SurveyFormData>({
        name: '',
        studentId: '',
        handedness: '',
        age: '',
        gender: '',
        nickname: '',
        preferredPraise: [],
        avoidExpressions: [],
    });

    const [errors, setErrors] = useState<Partial<Record<keyof SurveyFormData, string>>>({});

    const praiseOptions = PRAISE_OPTIONS[language as 'ja' | 'en'] || PRAISE_OPTIONS.ja;

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
                avoidExpressions: formData.avoidExpressions,
                language,
                createdAt: new Date(),
            };

            await saveParticipant(participantData);

            // ローカルストレージにも保存
            localStorage.setItem(`participant-${uuid}`, JSON.stringify(participantData));

            // 少し待ってから注意事項ページに遷移
            setTimeout(() => {
                router.push(`/instructions/${uuid}`);
            }, 500);

        } catch (error) {
            console.error('Failed to save participant data:', error);
            setIsSubmitting(false);
            // エラーハンドリング
            alert(language === 'ja' ? 'データの保存に失敗しました。もう一度お試しください。' : 'Failed to save data. Please try again.');
        }
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

    const addAvoidExpression = (expression: string) => {
        if (expression.trim() && !formData.avoidExpressions.includes(expression.trim())) {
            handleInputChange('avoidExpressions', [...formData.avoidExpressions, expression.trim()]);
        }
    };

    const removeAvoidExpression = (expression: string) => {
        handleInputChange('avoidExpressions', formData.avoidExpressions.filter(e => e !== expression));
    };

    const [avoidExpressionInput, setAvoidExpressionInput] = useState('');

    return (
        <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
            <div className="max-w-4xl w-full space-y-8">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl">事前アンケート</CardTitle>
                        <CardDescription className="text-lg">
                            実験参加前の基本情報とパーソナライゼーション設定
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* 基本情報セクション */}
                            <Card className="border-blue-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-xl">
                                        <User className="mr-2 h-5 w-5" />
                                        基本情報
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">

                                    {/* 名前 */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name">名前 *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="山田太郎"
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
                                            学籍番号 *
                                        </Label>
                                        <Input
                                            id="studentId"
                                            value={formData.studentId}
                                            onChange={(e) => handleInputChange('studentId', e.target.value)}
                                            placeholder="B1234567"
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
                                                利き手 *
                                            </Label>
                                            <RadioGroup
                                                value={formData.handedness}
                                                onValueChange={(value) => handleInputChange('handedness', value)}
                                                disabled={isSubmitting}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="right" id="right" />
                                                    <Label htmlFor="right">右利き</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="left" id="left" />
                                                    <Label htmlFor="left">左利き</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="other" id="handedness-other" />
                                                    <Label htmlFor="handedness-other">その他・回答しない</Label>
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
                                                年齢 *
                                            </Label>
                                            <Input
                                                id="age"
                                                type="number"
                                                min="1"
                                                max="150"
                                                value={formData.age}
                                                onChange={(e) => handleInputChange('age', e.target.value)}
                                                placeholder="20"
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
                                            性別 *
                                        </Label>
                                        <RadioGroup
                                            value={formData.gender}
                                            onValueChange={(value) => handleInputChange('gender', value)}
                                            disabled={isSubmitting}
                                            className="grid grid-cols-2 gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="male" id="male" />
                                                <Label htmlFor="male">男性</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="female" id="female" />
                                                <Label htmlFor="female">女性</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="other" id="gender-other" />
                                                <Label htmlFor="gender-other">その他</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="no-answer" id="no-answer" />
                                                <Label htmlFor="no-answer">回答しない</Label>
                                            </div>
                                        </RadioGroup>
                                        {errors.gender && (
                                            <p className="text-sm text-red-600">{errors.gender}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Separator />

                            {/* パーソナライゼーション設定セクション */}
                            <Card className="border-green-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-xl">
                                        <MessageCircle className="mr-2 h-5 w-5" />
                                        パーソナライゼーション設定
                                    </CardTitle>
                                    <CardDescription>
                                        実験中に表示されるフィードバックをあなた好みにカスタマイズします
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">

                                    {/* ニックネーム */}
                                    <div className="space-y-2">
                                        <Label htmlFor="nickname">フィードバックで呼ばれたいニックネーム *</Label>
                                        <Input
                                            id="nickname"
                                            value={formData.nickname}
                                            onChange={(e) => handleInputChange('nickname', e.target.value)}
                                            placeholder="太郎"
                                            disabled={isSubmitting}
                                            className={errors.nickname ? 'border-red-500' : ''}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            実験中のフィードバックで使用される名前です
                                        </p>
                                        {errors.nickname && (
                                            <p className="text-sm text-red-600">{errors.nickname}</p>
                                        )}
                                    </div>

                                    {/* 好きな褒め方（複数選択可能） */}
                                    <div className="space-y-3">
                                        <Label>好きな褒め方 * （複数選択可）</Label>
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
                                                            <Badge variant="default" className="ml-2">選択中</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {formData.preferredPraise.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    選択済み ({formData.preferredPraise.length}個):
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

                                    {/* 避けてほしい表現 */}
                                    <div className="space-y-3">
                                        <Label htmlFor="avoidExpressionInput">避けてほしい表現（任意）</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="avoidExpressionInput"
                                                value={avoidExpressionInput}
                                                onChange={(e) => setAvoidExpressionInput(e.target.value)}
                                                placeholder="例：頑張って、すごい"
                                                disabled={isSubmitting}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addAvoidExpression(avoidExpressionInput);
                                                        setAvoidExpressionInput('');
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    addAvoidExpression(avoidExpressionInput);
                                                    setAvoidExpressionInput('');
                                                }}
                                                disabled={isSubmitting || !avoidExpressionInput.trim()}
                                            >
                                                追加
                                            </Button>
                                        </div>
                                        {formData.avoidExpressions.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm text-muted-foreground">避けてほしい表現:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.avoidExpressions.map((expression, index) => (
                                                        <Badge
                                                            key={index}
                                                            variant="destructive"
                                                            className="flex items-center gap-1"
                                                        >
                                                            {expression}
                                                            <X
                                                                className="h-3 w-3 cursor-pointer"
                                                                onClick={() => removeAvoidExpression(expression)}
                                                            />
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            フィードバックで使用されたくない言葉や表現があれば入力してください
                                        </p>
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
                                    {isSubmitting ? '保存中...' : '設定を保存して次へ'}
                                </Button>
                            </div>

                            <div className="text-center text-xs text-muted-foreground space-y-1">
                                <p>* 必須項目</p>
                                <p>この情報は研究目的にのみ使用され、個人情報は厳格に保護されます</p>
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
