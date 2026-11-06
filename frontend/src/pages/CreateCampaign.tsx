import { money } from '@/assets';
import FormInput from '@/components/FormInput';
import { useState } from 'react';

interface FormFieldsProps {
  name: string;
  title: string;
  description: string;
  target: string;
  deadline: string;
  image: string;
}
export default function CreateCampaign() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [form, setform] = useState<FormFieldsProps>({
    name: '',
    title: '',
    description: '',
    target: '',
    deadline: '',
    image: '',
  });

  return (
    <div className="col-full-center rounded-lg bg-[#1c1c24] p-4 sm:p-10">
      {isLoading && 'Loader...'}
      <div className="flex-center rounded-lg bg-[#3a3a43] p-4 sm:min-w-95">
        <h1 className="font-epilogue text-lg leading-9.5 font-bold text-white sm:text-2xl">
          Start a Campaign
        </h1>
      </div>
      <form action="" className="col mt-16 w-full gap-7">
        <div className="flex flex-col gap-5 md:flex-row">
          <FormInput
            name="name"
            value={form.name}
            label="Your Name*"
            placeholder="John Doe"
            required
          />
          <FormInput
            name="title"
            value={form.title}
            label="Campaign Title*"
            placeholder="Write a title"
            required
          />
        </div>
        <FormInput
          name="description"
          value={form.description}
          label="Story*"
          type="textarea"
          placeholder="Why you are fundraising"
          required
        />

        <div className="just-start h-30 w-full items-center rounded-lg bg-[#8c6dfd] p-4">
          <img src={money} alt="money" className="size-10 object-contain" />
          <h4 className="font-epilogue text-6.25 ml-5 font-bold text-white">
            You will get 100% of the raised amount!
          </h4>
        </div>

        <div className="flex flex-col gap-5 md:flex-row">
          <FormInput
            name="target"
            value={form.target}
            label="Goal*"
            placeholder="John Doe"
            type='number'
            required
            />
            
          <FormInput
            name="deadline"
            value={form.deadline}
            label="End Date*"
            type='date'
            required
          />
        </div>
      </form>
    </div>
  );
}
