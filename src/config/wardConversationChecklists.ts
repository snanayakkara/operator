import { WardChecklistBank } from '@/types/wardConversation.types';

export const WARD_CONVERSATION_CHECKLIST_BANK: WardChecklistBank = {
  base: {
    daily: [
      {
        id: 'issues',
        title: 'Issues',
        type: 'issues',
        description: 'Summarise active issues, pick one at a time, and capture concise updates or changes.'
      },
      {
        id: 'new_results',
        title: 'New investigation results',
        type: 'investigations',
        description: 'Surface recent investigations and ask whether to record or update them today.'
      },
      {
        id: 'plan_items',
        title: 'Plan items & tasks',
        type: 'plan',
        description: 'Review open plan items/tasks, mark completed ones, and add new tasks from today.'
      },
      {
        id: 'edd',
        title: 'Expected discharge date',
        type: 'edd',
        description: 'Check if EDD needs updating and capture the clinician-proposed date.'
      }
    ],
    oncePerAdmission: [
      {
        id: 'dvt_prophylaxis',
        title: 'Confirm DVT prophylaxis addressed',
        action: 'task',
        description: 'Confirm DVT prophylaxis has been considered; create a task if needed and mark flag to avoid repeat prompts.',
        allowSkipForAdmission: true,
        flagKey: 'dvtProphylaxisConsidered',
        suggestedCategory: 'other',
        linkedIssueHint: 'venous thromboembolism risk'
      },
      {
        id: 'followup_arranged',
        title: 'Follow-up arranged',
        action: 'task',
        description: 'Ensure appropriate outpatient follow-up (cardiology clinic and/or GP) is organised.',
        allowSkipForAdmission: true,
        flagKey: 'followupArranged',
        suggestedCategory: 'followup'
      }
    ]
  },
  conditions: [
    {
      key: 'acute_decompensated_hf',
      label: 'Acute decompensated heart failure',
      hints: [
        'acute pulmonary oedema',
        'ADHF',
        'decompensated heart failure'
      ],
      issueExamples: [
        'Acute pulmonary oedema on background HFpEF',
        'ADHF requiring IV diuretics'
      ],
      items: [
        {
          id: 'adhf_iron_studies',
          title: 'Order iron studies / ferritin for HF optimisation',
          action: 'task',
          suggestedCategory: 'lab',
          allowSkipForAdmission: true
        },
        {
          id: 'adhf_gdmt',
          title: 'Optimise HF therapy (ACEi/ARB/ARNI, beta-blocker, MRA, SGLT2i as tolerated)',
          action: 'issue_update',
          allowSkipForAdmission: true,
          linkedIssueHint: 'heart failure therapy'
        },
        {
          id: 'adhf_diuretic_plan',
          title: 'Clarify IV/oral diuretic plan, weight goal, and fluid balance targets',
          action: 'task',
          suggestedCategory: 'other',
          allowSkipForAdmission: true
        },
        {
          id: 'adhf_daily_weights',
          title: 'Ensure daily weights and fluid balance charting',
          action: 'task',
          suggestedCategory: 'other',
          allowSkipForAdmission: true
        },
        {
          id: 'adhf_followup',
          title: 'Arrange HF clinic or telehealth follow-up after discharge',
          action: 'task',
          suggestedCategory: 'followup',
          allowSkipForAdmission: true
        }
      ]
    },
    {
      key: 'aortic_stenosis',
      label: 'Aortic stenosis',
      hints: [
        'severe AS',
        'TAVI workup',
        'calcific aortic stenosis'
      ],
      issueExamples: [
        'Severe calcific aortic stenosis awaiting TAVI'
      ],
      items: [
        {
          id: 'as_ct_tavi',
          title: 'Arrange CT TAVI planning',
          action: 'task',
          suggestedCategory: 'imaging',
          allowSkipForAdmission: true
        },
        {
          id: 'as_ecg_review',
          title: 'Review recent ECG for conduction disease',
          action: 'task',
          suggestedCategory: 'other',
          allowSkipForAdmission: true
        },
        {
          id: 'as_amyloid_screen',
          title: 'Consider amyloidosis screen if phenotype fits',
          action: 'investigation',
          suggestedCategory: 'lab',
          allowSkipForAdmission: true
        },
        {
          id: 'as_coronary_angio',
          title: 'Consider coronary angiogram before TAVI',
          action: 'task',
          suggestedCategory: 'imaging',
          allowSkipForAdmission: true
        }
      ]
    },
    {
      key: 'hfpef',
      label: 'HFpEF',
      hints: [
        'heart failure with preserved EF',
        'HFpEF',
        'diastolic dysfunction'
      ],
      issueExamples: [
        'HFpEF with recurrent congestion'
      ],
      items: [
        {
          id: 'hfpef_amyloid',
          title: 'Screen for amyloidosis if red flags present',
          action: 'investigation',
          suggestedCategory: 'lab',
          allowSkipForAdmission: true
        },
        {
          id: 'hfpef_bp_volume',
          title: 'Optimise blood pressure and volume status plan',
          action: 'issue_update',
          allowSkipForAdmission: true
        },
        {
          id: 'hfpef_sleep',
          title: 'Consider sleep apnoea screening',
          action: 'task',
          suggestedCategory: 'other',
          allowSkipForAdmission: true
        },
        {
          id: 'hfpef_trial',
          title: 'Assess suitability for HFpEF clinic or trial',
          action: 'task',
          suggestedCategory: 'followup',
          allowSkipForAdmission: true
        }
      ]
    },
    {
      key: 'atrial_fibrillation',
      label: 'Atrial fibrillation',
      hints: [
        'paroxysmal AF',
        'atrial fibrillation',
        'AF with RVR'
      ],
      issueExamples: [
        'Paroxysmal AF on apixaban',
        'AF with RVR'
      ],
      items: [
        {
          id: 'af_anticoagulation',
          title: 'Confirm anticoagulation/CHA2DS2-VASc plan',
          action: 'issue_update',
          allowSkipForAdmission: true
        },
        {
          id: 'af_rate_control',
          title: 'Review rate control plan and beta-blocker/CCB dosing',
          action: 'issue_update',
          allowSkipForAdmission: true
        },
        {
          id: 'af_rhythm_control',
          title: 'Consider rhythm control or ablation referral',
          action: 'task',
          suggestedCategory: 'followup',
          allowSkipForAdmission: true
        },
        {
          id: 'af_sleep_apnoea',
          title: 'Screen for sleep apnoea contributing to AF',
          action: 'task',
          suggestedCategory: 'other',
          allowSkipForAdmission: true
        },
        {
          id: 'af_followup',
          title: 'Plan outpatient ECG/monitor or clinic follow-up',
          action: 'task',
          suggestedCategory: 'followup',
          allowSkipForAdmission: true
        }
      ]
    }
  ],
  quickResponses: ['yes', 'no', 'skip this item', 'not now', 'done']
};
