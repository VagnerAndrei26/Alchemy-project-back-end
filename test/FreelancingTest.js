const {
  loadFixture,
  time,
  helpers
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");


describe("Freelancing Contract", function () {

  async function deployFreelancingContract() {

    const [employer, employee, otherAccount] = await ethers.getSigners();

    const FreelancingContract = await ethers.getContractFactory("FreelancingContract");
    const freelancingContract = await FreelancingContract.deploy();

    return { freelancingContract, employer, employee, otherAccount };
  }

  describe("Create new job and apply to it", function () {
    it("Should create a job succesfully with the job title and description correctly", async function () {
      const { freelancingContract, employer } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      expect(await freelancingContract.getJobTitle(0)).to.equal("Java developer");
      expect(await freelancingContract.getJobDescription(0)).to.equal("5 years of experience");
      expect(await freelancingContract.getEmployer(0)).to.equal(employer.address);
      expect(await freelancingContract.getNumberOfListedJobs()).to.equal(1);
      
    });

    it("Should revert the apply function if the employer applies", async function () {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await expect(freelancingContract.connect(employer).applyJob(0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__EmployerCantEmployHimself");

    });

    it("Should let an address apply", async function () {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      expect(await freelancingContract.getApplicant(0)).to.equal(employee.address);
    });

    it("Should revert if the applicant applies again", async function () {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await expect(freelancingContract.connect(employee).applyJob(0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__AlreadyApplied");
    });
  });

  describe("Approve and decline the job", function () {
    it("Should revert if anyone else beside the employer call the approve function", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);

      await expect(freelancingContract.connect(employee).approveJob(employee.address, 0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotEmployer");

    });
    it("Should revert if the address has not applied", async function() {
      const { freelancingContract, employee, employer,otherAccount } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);

      await expect(freelancingContract.connect(employer).approveJob(otherAccount.address, 0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotApplied");
    });
    it("Should let the employer approve the employee", async function() {
      const { freelancingContract, employee, employer,otherAccount } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);

      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      expect(await freelancingContract.getEmployee(0)).to.equal(employee.address);
    });
    it("Should revert if anyone else beside the employer call the decline function", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);

      await expect(freelancingContract.connect(employee).declineJob(employee.address, 0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotEmployer");

    });
    it("Should let the employer decline the employee", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);

      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);

      await freelancingContract.connect(employer).declineJob(employee.address, 0);
      expect(await freelancingContract.getEmployee(0)).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("Set the paycheck and accept it", function() {
    it("Should let only the employer set the price", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);

      await expect(freelancingContract.connect(employee).setPayCheck(50,0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotEmployer");

    })
    it("Should let only the employer set the price only if there is an employee ", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).declineJob(employee.address, 0);

      await expect(freelancingContract.connect(employer).setPayCheck(50,0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__JobNotApproved");

    })
    it("Should let only the employer set the price only if the employer accepted the payCheck ", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);

      await expect(freelancingContract.connect(employer).setPayCheck(50,0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__PayNotAccepted");

    })
    it("Should let only the employee use the acceptChangeOfPayCheck function", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await expect(freelancingContract.connect(employer).acceptChangeOfPayCheck(0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotEmployee");
    })
    it("Should let only the employer set the pay check after all the requierments are met", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);

      await freelancingContract.connect(employer).setPayCheck(50,0);
      expect(await freelancingContract.getPayCheckInUsd(0)).to.equal(50);
    })
  })
  describe("Pay the employee", function() {
    it("Should revert if payEmployee is not called by the employee", async function() {
      const { freelancingContract, employee, employer, otherAccount } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);
      await freelancingContract.connect(employer).setPayCheck(50,0);

      await expect(freelancingContract.connect(otherAccount).payEmployee(0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotEmployer");
    })
    it("Should revert if not enough time has passed", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);
      await freelancingContract.connect(employer).setPayCheck(50,0);

      await expect(freelancingContract.connect(employer).payEmployee(0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__PayOnlyOnceAMonth");
    })
    it("Should revert if not enough money has passed", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);
      await freelancingContract.connect(employer).setPayCheck(50,0);
      await time.increase(2593000)

      await expect(freelancingContract.connect(employer).payEmployee(0,{value: ethers.utils.parseEther("0.001")})).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotEnoughEtherProvided");
    })
    it("Should pay the employee if enough time has passed and the amount of ether is provided", async function() {
      const { freelancingContract, employee, employer } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);
      await freelancingContract.connect(employer).setPayCheck(50,0);
      await time.increase(2593000)

      await expect(freelancingContract.connect(employer).payEmployee(0,{value: ethers.utils.parseEther("0.04")})).to.not.reverted;
    })
  })
  describe("Dismiss the employee" , function() {
    it("The function should be only called by the employer", async function() {
      const { freelancingContract, employee, employer, otherAccount } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);
      await freelancingContract.connect(employer).setPayCheck(50,0);
      await expect(freelancingContract.connect(otherAccount).dismissEmployee(0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__NotEmployer");
    })
    it("Should revert because the employee has not been paid", async function() {
      const { freelancingContract, employee, employer, otherAccount } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);
      await freelancingContract.connect(employer).setPayCheck(50,0);
      await expect(freelancingContract.connect(employer).dismissEmployee(0)).to.be.revertedWithCustomError(freelancingContract, "FreelancingBasicContract__CantDismissInTheFirstMonth");
    })
    it("Should dismiss the employee because he has been paid once", async function() {
      const { freelancingContract, employee, employer, otherAccount } = await loadFixture(deployFreelancingContract);
      
      await freelancingContract.connect(employer).createJob("Java developer", "5 years of experience");
      await freelancingContract.connect(employee).applyJob(0);
      await freelancingContract.connect(employer).approveJob(employee.address, 0);
      await freelancingContract.connect(employee).acceptChangeOfPayCheck(0);
      await freelancingContract.connect(employer).setPayCheck(50,0);
      await time.increase(2593000);
      await freelancingContract.connect(employer).payEmployee(0,{value: ethers.utils.parseEther("0.04")});
      
      await expect(freelancingContract.connect(employer).dismissEmployee(0)).to.not.be.reverted;
      
    })
    })
  });
